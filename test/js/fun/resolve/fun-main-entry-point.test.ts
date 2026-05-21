import { expect, test } from "fun:test";
import { funEnv, funExe, isDebug, tempDir } from "harness";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

// `fun:main` is backed by ServerEntryPoint.contents — a slice that is
// regenerated on every hot-reload cycle. Previously the backing
// `logger.Source` defaulted to `undefined`, so any read of
// `entry_point.source.contents` that wasn't paired with a successful
// `generate()` dereferenced garbage (high non-null fault in
// toFunStringComptime). These tests exercise the read path directly and
// the regenerate path under --hot so ASAN covers the new
// free-then-reallocate on each reload.

function stripAsanWarning(stderr: string): string[] {
  return stderr.split("\n").filter(l => l.length > 0 && !l.startsWith("WARNING: ASAN interferes"));
}

test.concurrent("dynamic import('fun:main') returns the wrapper module", async () => {
  using dir = tempDir("fun-main-dyn", {
    // package.json disables auto-install so a regression in the fun:main alias
    // cannot silently fall through to fetching the npm `main` package.
    "package.json": "{}",
    // fun:main statically imports entry.mjs, so awaiting import("fun:main")
    // at the top level of entry.mjs is a TLA self-cycle that never resolves.
    // Defer the import to a .then() so entry.mjs (and therefore fun:main)
    // can finish evaluating first.
    "entry.mjs": `
      import("fun:main").then(m => {
        if (m[Symbol.toStringTag] !== "Module") throw new Error("expected module namespace, got " + Object.prototype.toString.call(m));
        // The wrapper has no named exports. The npm \`main\` package (what this
        // resolved to before the alias fix) exports {default,length,name,prototype}.
        const keys = Object.keys(m);
        if (keys.length !== 0) throw new Error("expected empty wrapper namespace, got keys: " + keys.join(","));
        console.log("OK");
      }).catch(e => {
        console.error(String(e));
        process.exit(1);
      });
    `,
  });
  await using proc = Fun.spawn({
    cmd: [funExe(), "./entry.mjs"],
    env: funEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  expect({ stdout, stderr: stripAsanWarning(stderr), exitCode, signalCode: proc.signalCode }).toEqual({
    stdout: "OK\n",
    stderr: [],
    exitCode: 0,
    signalCode: null,
  });
});

test.concurrent("import('fun:main') from a preload (before the module map is populated)", async () => {
  using dir = tempDir("fun-main-preload", {
    "package.json": "{}",
    "preload.mjs": `
      const m = await import("fun:main");
      if (m[Symbol.toStringTag] !== "Module") throw new Error("expected module namespace");
      console.log("PRELOAD_OK");
    `,
    "entry.mjs": `console.log("ENTRY_OK");`,
  });
  await using proc = Fun.spawn({
    cmd: [funExe(), "--preload", "./preload.mjs", "./entry.mjs"],
    env: funEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
  // import("fun:main") evaluates the wrapper, which evaluates entry.mjs, so
  // ENTRY_OK prints before the preload's await resumes.
  expect({ stdout, stderr: stripAsanWarning(stderr), exitCode, signalCode: proc.signalCode }).toEqual({
    stdout: "ENTRY_OK\nPRELOAD_OK\n",
    stderr: [],
    exitCode: 0,
    signalCode: null,
  });
});

test.concurrent(
  "ServerEntryPoint regenerates cleanly across --hot reloads",
  async () => {
    // Each reload calls ServerEntryPoint.generate() again, which now frees the
    // previous `contents` buffer before allocating a fresh one. Drive several
    // reloads and verify fun:main is re-fetched and evaluates correctly each
    // time; under ASAN this catches any use-after-free of the prior buffer.
    using dir = tempDir("fun-main-hot", {
      "entry.mjs": `globalThis.__gen = (globalThis.__gen ?? 0) + 1;\nconsole.log("GEN", 0);\n`,
    });
    const entry = join(String(dir), "entry.mjs");

    await using proc = Fun.spawn({
      cmd: [funExe(), "--hot", entry],
      env: { ...funEnv, FUN_DEBUG_QUIET_LOGS: "1" },
      cwd: String(dir),
      stdout: "pipe",
      stderr: "pipe",
    });

    // Drain stderr concurrently so a large sanitizer report can't fill the
    // pipe buffer and wedge the child while we're blocked on stdout.
    const stderrPromise = proc.stderr.text();

    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffered = "";

    const waitForLine = async (needle: string) => {
      while (!buffered.includes(needle)) {
        const { value, done } = await reader.read();
        if (done)
          throw new Error(`stdout closed before seeing ${JSON.stringify(needle)}; buffer=${JSON.stringify(buffered)}`);
        buffered += decoder.decode(value, { stream: true });
      }
    };

    await waitForLine("GEN 0\n");

    for (let i = 1; i <= 4; i++) {
      writeFileSync(entry, `globalThis.__gen = (globalThis.__gen ?? 0) + 1;\nconsole.log("GEN", ${i});\n`);
      await waitForLine(`GEN ${i}\n`);
    }

    proc.kill();
    reader.releaseLock();
    await proc.exited;
    await stderrPromise;

    // Reaching GEN 4 proves the wrapper was regenerated and re-read via
    // cloneUTF8 on every reload without faulting on a stale slice.
    expect(buffered).toContain("GEN 4\n");
  },
  isDebug ? 60_000 : 30_000,
);
