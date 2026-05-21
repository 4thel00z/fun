/**
 * CI integration: collapsible log groups, environment dump, Buildkite
 * annotations on build failure.
 *
 * Thin layer over `scripts/utils.mjs` — the same helpers the CMake build
 * uses. We import rather than reimplement so CI logs look identical and
 * annotation regex stays in one place.
 */

import { spawn as nodeSpawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore — utils.mjs has JSDoc types but no .d.ts
import * as utils from "../utils.mjs";
import { funExeName, shouldStrip, type FunOutput } from "./fun.ts";
import type { Config } from "./config.ts";
import { BuildError } from "./error.ts";

/** True if running under any CI (env: CI, BUILDKITE, or GITHUB_ACTIONS). */
export const isCI: boolean = utils.isCI;

/** True if running under Buildkite specifically. */
export const isBuildkite: boolean = utils.isBuildkite;

/** True if running under GitHub Actions specifically. */
export const isGithubAction: boolean = utils.isGithubAction;

/**
 * Print machine/environment/repository info in collapsible groups.
 * Call at the top of a CI run so you can diagnose without SSH access.
 */
export const printEnvironment: () => void = utils.printEnvironment;

/**
 * Start a collapsible log group. Buildkite: `--- Title`. GitHub: `::group::`.
 * If `fn` is given, runs it and closes the group (handles async).
 */
export const startGroup: (title: string, fn?: () => unknown) => unknown = utils.startGroup;

/** Close the most recent group opened with `startGroup`. */
export const endGroup: () => void = utils.endGroup;

interface SpawnAnnotatedOptions {
  /** Working directory for the subprocess. */
  cwd?: string;
  /** Label for duration printing (defaults to basename of command). */
  label?: string;
  /** Environment variables for the subprocess. */
  env?: NodeJS.ProcessEnv;
}

/**
 * Spawn a subprocess with CI output handling. Only call this in CI —
 * locally use plain spawnSync for zero-overhead no-ops.
 *
 * Tees stdout/stderr to the terminal AND a buffer. On non-zero exit,
 * parses the buffer for compiler errors (zig/clang/cmake) and posts each
 * as a Buildkite annotation. If nothing parseable is found, posts a generic
 * "build failed" annotation with the full output. Prints duration at end.
 *
 * Exits the process with the subprocess's exit code on failure.
 * Returns only on success.
 */
export async function spawnWithAnnotations(
  command: string,
  args: string[],
  opts: SpawnAnnotatedOptions = {},
): Promise<void> {
  const label = opts.label ?? command;

  const child = nodeSpawn(command, args, {
    stdio: "pipe",
    cwd: opts.cwd,
    env: opts.env,
  });

  // Kill child on parent signals so ninja doesn't linger.
  let killedManually = false;
  const onKill = () => {
    if (!child.killed) {
      killedManually = true;
      child.kill();
    }
  };
  if (process.platform !== "win32") {
    process.once("beforeExit", onKill);
    process.once("SIGINT", onKill);
    process.once("SIGTERM", onKill);
  }
  const clearOnKill = () => {
    process.off("beforeExit", onKill);
    process.off("SIGINT", onKill);
    process.off("SIGTERM", onKill);
  };

  const start = Date.now();
  let buffer = "";

  // Tee: write to terminal live AND buffer for later annotation parsing.
  const stdout = new Promise<void>(resolve => {
    child.stdout!.on("end", resolve);
    child.stdout!.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      process.stdout.write(chunk);
    });
  });
  const stderr = new Promise<void>(resolve => {
    child.stderr!.on("end", resolve);
    child.stderr!.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      process.stderr.write(chunk);
    });
  });

  const { exitCode, signalCode, error } = await new Promise<{
    exitCode: number | null;
    signalCode: NodeJS.Signals | null;
    error?: Error;
  }>(resolve => {
    child.on("error", error => {
      clearOnKill();
      resolve({ exitCode: null, signalCode: null, error });
    });
    child.on("exit", (exitCode, signalCode) => {
      clearOnKill();
      resolve({ exitCode, signalCode });
    });
  });

  await Promise.all([stdout, stderr]);

  const elapsed = Date.now() - start;
  const elapsedStr =
    elapsed > 60000 ? `${(elapsed / 60000).toFixed(2)} minutes` : `${(elapsed / 1000).toFixed(2)} seconds`;
  console.log(`${label} took ${elapsedStr}`);

  if (error) {
    console.error(`Failed to spawn ${command}: ${error.message}`);
    process.exit(127);
  }

  if (exitCode === 0) return;

  // ─── Failure: report annotations to Buildkite ───
  if (isBuildkite) {
    let annotated = false;
    try {
      // In piped mode, ninja prints ALL command output including successful
      // jobs — so the buffer contains dep cmake deprecation warnings from
      // vendored CMakeLists.txt we don't control. Keep dep errors (broken
      // compiler, bad flags) since those are actionable; drop dep warnings.
      const annotatable = buffer
        .split("\n")
        .filter(line => !/^\[[\w-]+\]\s+CMake (Deprecation )?Warning/i.test(line.replace(/\x1b\[[0-9;]*m/g, "")))
        .join("\n");
      const { annotations } = utils.parseAnnotations(annotatable);
      for (const ann of annotations) {
        utils.reportAnnotationToBuildKite({
          priority: 10,
          label: ann.title || ann.filename,
          content: utils.formatAnnotationToHtml(ann),
        });
        annotated = true;
      }
    } catch (err) {
      console.error("Failed to parse annotations:", err);
    }

    // Nothing matched the compiler-error regexes → post a generic annotation
    // with the full buffered output so there's still a PR-visible signal.
    if (!annotated) {
      const content = utils.formatAnnotationToHtml({
        filename: relative(process.cwd(), fileURLToPath(import.meta.url)),
        title: "build failed",
        content: buffer,
        source: "build",
        level: "error",
      });
      utils.reportAnnotationToBuildKite({
        priority: 10,
        label: "build failed",
        content,
      });
    }
  }

  if (signalCode) {
    if (!killedManually) console.error(`Command killed: ${signalCode}`);
  } else {
    console.error(`Command exited: code ${exitCode}`);
  }

  process.exit(exitCode ?? 1);
}

// ───────────────────────────────────────────────────────────────────────────
// Buildkite artifacts — split-build upload/download
//
// CI splits builds per-platform into three parallel steps:
//   build-cpp  → libfun.a + all dep libs (this node uploads)
//   build-zig  → fun-zig.o (this node uploads)
//   build-fun  → downloads both, links (this node downloads first)
//
// Paths are uploaded RELATIVE TO buildDir. buildkite-agent recreates the
// directory structure on download. The link-only ninja graph expects files
// at the SAME relative paths cpp-only produced them at — computeDepLibs()
// and emitNestedCmake() share the same path formula.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Upload build artifacts after a successful cpp-only or zig-only build.
 * Runs `buildkite-agent artifact upload` with paths relative to buildDir.
 *
 * Large archives (libfun-*.a, >1GB) are gzipped — buildkite artifact
 * storage is fine but upload/download is faster. link-only gunzips.
 *
 * ORDER MATTERS: upload dep libs FIRST (some live in cache/ — WebKit
 * prebuilt), THEN rm cache + gzip + upload the archive. If cache is
 * deleted first, WebKit lib upload fails with "file not found". The
 * old cmake had this ordering implicitly — each dep's build uploaded
 * its libs immediately; rm only ran when the archive target fired.
 */
export function uploadArtifacts(cfg: Config, output: FunOutput): void {
  if (!isBuildkite) {
    console.log("Not in Buildkite — skipping artifact upload");
    return;
  }

  if (cfg.mode === "zig-only") {
    const paths = output.zigObjects.map(obj => relative(cfg.buildDir, obj));
    console.log(`Uploading ${paths.length} zig artifacts...`);
    upload(paths, cfg.buildDir);
    return;
  }

  if (cfg.mode !== "cpp-only") {
    // full/link-only don't upload split artifacts.
    return;
  }

  // ─── Phase 1: upload dep libs (before we rm anything) ───
  // In Buildkite, ninja already uploaded these via the bk_upload edge in
  // fun.ts (overlapped with the cxx compile). The stamp is the witness; if
  // it's missing (agent unavailable mid-build, or running cpp-only outside
  // a real BK job), fall back to uploading here so link-only still gets them.
  if (existsSync(resolve(cfg.buildDir, ".dep-libs-uploaded"))) {
    console.log("Dep libs already uploaded during build");
  } else {
    const depPaths: string[] = [];
    for (const dep of output.deps) {
      for (const lib of dep.libs) {
        depPaths.push(relative(cfg.buildDir, lib));
      }
    }
    console.log(`Uploading ${depPaths.length} dep libs...`);
    upload(depPaths, cfg.buildDir);
  }

  // ─── Phase 2: free disk, gzip (posix only), upload archive ───
  // CI agents are disk-constrained. Free what we no longer need: codegen/
  // (sources already compiled into the archive), obj/ (.o files archived),
  // cache/ (WebKit prebuilt — libs uploaded in phase 1, rest is headers
  // + tarball we won't touch again).
  if (output.archive !== undefined) {
    const archiveName = basename(output.archive);

    console.log("Cleaning intermediate files to free disk...");
    rmSync(cfg.codegenDir, { recursive: true, force: true });
    rmSync(resolve(cfg.buildDir, "obj"), { recursive: true, force: true });
    rmSync(cfg.cacheDir, { recursive: true, force: true });

    // gzip: posix only (matches cmake — only libfun-*.a are gzipped,
    // Windows .lib archives uploaded uncompressed). gzip isn't a
    // standard Windows tool anyway; the .lib is smaller (PDB is separate).
    // downloadArtifacts() only gunzips .gz files it finds, so Windows
    // archives pass through unchanged.
    if (cfg.windows) {
      console.log("Uploading archive (Windows: no gzip)...");
      upload([archiveName], cfg.buildDir);
    } else {
      console.log(`Compressing ${archiveName}...`);
      run(["gzip", "-1", archiveName], cfg.buildDir);
      console.log("Uploading archive...");
      upload([`${archiveName}.gz`], cfg.buildDir);
    }
  }
}

/**
 * Upload via buildkite-agent. Semicolon-joined single arg — the agent
 * splits on ";" by default (--delimiter flag, Value: ";"). Second
 * positional arg is interpreted as upload DESTINATION, not another path.
 */
function upload(paths: string[], cwd: string): void {
  if (paths.length === 0) return;
  run(["buildkite-agent", "artifact", "upload", paths.join(";")], cwd);
}

// ───────────────────────────────────────────────────────────────────────────
// Link-only post-link: features.json + packaging + upload
//
// The zip contract (matching cmake's BuildFun.cmake packaging — test steps
// download these by exact name):
//
//   ${funTriplet}-profile.zip   (plain release)
//     └── ${funTriplet}-profile/
//           ├── fun-profile[.exe]
//           ├── features.json
//           ├── fun-profile.linker-map   (linux/mac non-asan)
//           ├── fun-profile.pdb          (windows)
//           └── fun-profile.dSYM         (mac)
//
//   ${funTriplet}.zip           (stripped, plain release only)
//     └── ${funTriplet}/
//           └── fun[.exe]
//
//   ${funTriplet}-asan.zip      (asan — single zip, no strip)
//     └── ${funTriplet}-asan/
//           ├── fun-asan
//           └── features.json
//
// funTriplet = fun-${os}-${arch}[-musl][-baseline]
//
// Test steps (runner.node.mjs) download '**' from build-fun and pick any
// fun*.zip; baseline-verification step downloads ${triplet}.zip specifically
// and expects ${triplet}/fun inside.
// ───────────────────────────────────────────────────────────────────────────

/**
 * Base triplet (fun-os-arch[-musl][-baseline]). Variant suffix (-profile,
 * -asan) is added by the caller. Matches ci.mjs getTargetTriplet() and
 * cmake's funTriplet — any drift breaks test-step downloads.
 */
function computeFunTriplet(cfg: Config): string {
  let t = `fun-${cfg.os}-${cfg.arch}`;
  if (cfg.abi === "musl") t += "-musl";
  if (cfg.abi === "android") t += "-android";
  if (cfg.baseline) t += "-baseline";
  return t;
}

/**
 * Post-link packaging and upload for link-only mode. Runs AFTER ninja
 * succeeds — at that point fun-profile (and stripped fun) exist.
 *
 * Generates features.json, packages into zips,
 * uploads. Contract with test steps: see block comment above.
 */
export function packageAndUpload(cfg: Config, output: FunOutput): void {
  if (!isBuildkite || cfg.mode !== "link-only") return;

  const exe = output.exe;
  if (exe === undefined) {
    throw new BuildError("link-only packaging: output.exe unset");
  }

  const buildDir = cfg.buildDir;
  const exeName = funExeName(cfg); // fun-profile, fun-asan, etc.
  const funTriplet = computeFunTriplet(cfg);

  // ─── features.json ───
  // Run the built fun with features.mjs to dump its feature flags.
  // Env vars match cmake's (BuildFun.cmake ~1462).
  // No setarch wrapper — cmake doesn't use one for features.mjs either
  // (only for the --revision smoke test).
  // Cross-compiled binaries can't run on the build host — write a stub.
  if (cfg.crossTarget !== undefined) {
    console.log("Skipping features.json (cross-compiled binary cannot run on host)");
    writeFileSync(resolve(buildDir, "features.json"), JSON.stringify({ crossTarget: cfg.crossTarget }));
  } else {
    console.log("Generating features.json...");
    run([exe, resolve(cfg.cwd, "scripts", "features.mjs")], buildDir, {
      FUN_GARBAGE_COLLECTOR_LEVEL: "1",
      FUN_DEBUG_QUIET_LOGS: "1",
      FUN_FEATURE_FLAG_INTERNAL_FOR_TESTING: "1",
    });
  }

  const zipPaths: string[] = [];

  // ─── Profile/variant zip ───
  // cmake's funPath: string(REPLACE fun ${funTriplet} funPath ${fun})
  // where ${fun} is the target name (fun-profile, fun-asan, ...).
  // Result: fun-linux-x64-profile, fun-linux-x64-asan, etc.
  const funPath = exeName.replace(/^fun/, funTriplet);
  const files: string[] = [basename(exe), "features.json"];
  // Debug symbols / linker map — platform-specific extras.
  if (cfg.windows) {
    files.push(`${exeName}.pdb`);
  } else if (cfg.darwin) {
    files.push(`${exeName}.dSYM`);
  }
  // Linker map: posix non-asan (cmake gate: (APPLE OR LINUX) AND NOT ENABLE_ASAN).
  if (cfg.unix && !cfg.asan) {
    files.push(`${exeName}.linker-map`);
  }
  zipPaths.push(makeZip(cfg, funPath, files));

  // ─── Stripped zip ───
  // Only for plain release (shouldStrip). Just the stripped `fun` binary.
  // cmake: funStripPath = string(REPLACE fun ${funTriplet} funStripPath fun) = funTriplet.
  if (shouldStrip(cfg) && output.strippedExe !== undefined) {
    zipPaths.push(makeZip(cfg, funTriplet, [basename(output.strippedExe)]));
    const bytes = statSync(output.strippedExe).size;
    run(["buildkite-agent", "meta-data", "set", `binary-size:${funTriplet}`, String(bytes)], buildDir);
  }

  // ─── Upload ───
  console.log(`Uploading ${zipPaths.length} zips...`);
  upload(zipPaths, buildDir);
}

/**
 * Create a zip at buildDir/${name}.zip containing buildDir/${name}/<files>.
 *
 * Uses `cmake -E tar cfv x.zip --format=zip` — cmake's cross-platform
 * zip wrapper (wraps libarchive). GNU tar (Linux default) DOESN'T support
 * --format=zip; bsdtar does but isn't guaranteed on Linux. cmake is
 * already a required tool (we use it for nested dep builds), so this
 * adds no new dependency. Identical to cmake's own packaging approach
 * (BuildFun.cmake:1544).
 *
 * Files that don't exist are silently skipped (e.g., .pdb on a clean build).
 * Returns the zip path relative to buildDir (for the upload call).
 */
function makeZip(cfg: Config, name: string, files: string[]): string {
  const buildDir = cfg.buildDir;
  const stageDir = resolve(buildDir, name);
  const zip = `${name}.zip`;

  // Clean previous run (idempotent).
  rmSync(stageDir, { recursive: true, force: true });
  rmSync(resolve(buildDir, zip), { force: true });
  mkdirSync(stageDir, { recursive: true });

  // Copy files that exist. Some debug outputs (.pdb, .dSYM, .linker-map)
  // are optional depending on build config — skip rather than fail so a
  // missing optional file doesn't break packaging.
  let copied = 0;
  for (const f of files) {
    const src = resolve(buildDir, f);
    if (!existsSync(src)) {
      console.log(`  (skip missing: ${f})`);
      continue;
    }
    cpSync(src, resolve(stageDir, basename(f)), { recursive: true });
    copied++;
  }

  console.log(`Creating ${zip} (${copied} files)...`);
  // Relative path `name` puts `name/` prefix inside the zip — what test
  // steps expect: they extract → `chmod +x ${triplet}/fun`.
  run([cfg.cmake, "-E", "tar", "cfv", zip, "--format=zip", name], buildDir);

  // Clean up the staging dir.
  rmSync(stageDir, { recursive: true, force: true });

  return zip;
}

/**
 * Download artifacts from sibling buildkite steps before a link-only build.
 * Derives sibling step keys from BUILDKITE_STEP_KEY (swap `-build-fun` →
 * `-build-cpp` / `-build-zig`). Gunzips any .gz files after download.
 *
 * Call BEFORE ninja — the downloaded files are ninja's link inputs.
 */
export async function downloadArtifacts(cfg: Config): Promise<void> {
  if (cfg.mode !== "link-only") return;

  const stepKey = process.env.BUILDKITE_STEP_KEY;
  if (stepKey === undefined) {
    throw new BuildError("BUILDKITE_STEP_KEY unset", {
      hint: "link-only mode requires running inside a Buildkite job",
    });
  }

  // step key is `<target>-build-fun`; siblings are `<target>-build-{cpp,zig}`.
  const m = stepKey.match(/^(.+)-build-fun$/);
  if (m === null) {
    throw new BuildError(`Unexpected BUILDKITE_STEP_KEY: ${stepKey}`, {
      hint: "Expected format: <target>-build-fun",
    });
  }
  const targetKey = m[1]!;

  // Both downloads at once (buildkite-agent already parallelizes within a
  // step's artifact set; this overlaps the two STEPS). The .a.gz comes from
  // build-cpp, so gunzip can start as soon as that one finishes — concurrent
  // with the build-zig download still streaming.
  const dl = (suffix: "cpp" | "zig") => {
    const step = `${targetKey}-build-${suffix}`;
    console.log(`Downloading artifacts from ${step}...`);
    return runAsync(["buildkite-agent", "artifact", "download", "*", ".", "--step", step], cfg.buildDir);
  };
  const cppDone = dl("cpp");
  const zigDone = dl("zig");

  await cppDone;
  const gzFiles = existsSync(cfg.buildDir)
    ? readdirSync(cfg.buildDir).filter(f => f.endsWith(".gz") && statSync(resolve(cfg.buildDir, f)).isFile())
    : [];
  const gunzipDone = Promise.all(
    gzFiles.map(gz => {
      console.log(`Decompressing ${gz}...`);
      return runAsync(["gunzip", "-f", gz], cfg.buildDir);
    }),
  );

  await Promise.all([zigDone, gunzipDone]);
}

/** Run a command synchronously, throw BuildError on non-zero exit. */
function run(argv: string[], cwd: string, env?: Record<string, string>): void {
  const result = spawnSync(argv[0]!, argv.slice(1), {
    cwd,
    stdio: "inherit",
    env: env ? { ...process.env, ...env } : undefined,
  });
  if (result.error) {
    throw new BuildError(`Failed to spawn ${argv[0]}`, { cause: result.error });
  }
  if (result.status !== 0) {
    throw new BuildError(`${argv[0]} exited with code ${result.status}`, {
      hint: `Command: ${argv.join(" ")}`,
    });
  }
}

/** Async variant of `run()` for overlapping independent steps. */
function runAsync(argv: string[], cwd: string): Promise<void> {
  return new Promise((res, rej) => {
    const child = nodeSpawn(argv[0]!, argv.slice(1), { cwd, stdio: "inherit" });
    child.on("error", (err: Error) => rej(new BuildError(`Failed to spawn ${argv[0]}`, { cause: err })));
    child.on("close", (code: number | null) => {
      if (code === 0) res();
      else rej(new BuildError(`${argv[0]} exited with code ${code}`, { hint: `Command: ${argv.join(" ")}` }));
    });
  });
}
