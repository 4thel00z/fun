import { spawnSync } from "fun";
import { describe, expect, test } from "fun:test";
import { readdirSync } from "fs";
import { funEnv, funExe, tempDir } from "harness";

describe("FUN_OPTIONS environment variable", () => {
  test("basic usage - passes options to fun command", () => {
    const result = spawnSync({
      cmd: [funExe()],
      env: {
        ...funEnv,
        FUN_OPTIONS: "--print='FUN_OPTIONS WAS A SUCCESS'",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("FUN_OPTIONS WAS A SUCCESS");
  });

  test("multiple options - passes all options to fun command", () => {
    const result = spawnSync({
      cmd: [funExe()],
      env: {
        ...funEnv,
        FUN_OPTIONS: "--print='MULTIPLE OPTIONS' --quiet",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("MULTIPLE OPTIONS");
  });

  test("options with quotes - properly handles quoted options", () => {
    const result = spawnSync({
      cmd: [funExe()],
      env: {
        ...funEnv,
        FUN_OPTIONS: '--print="QUOTED OPTIONS"',
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("QUOTED OPTIONS");
  });

  test("priority - environment options go before command line options", () => {
    // First FUN_OPTIONS arg should be inserted before command line args
    const result = spawnSync({
      cmd: [funExe(), "--print='COMMAND LINE'"],
      env: {
        ...funEnv,
        FUN_OPTIONS: "--quiet",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("COMMAND LINE");
  });

  test("bare flag before flag with value is recognized", () => {
    // Bare flags (no =) that aren't the last option must not get a
    // trailing space appended. --cpu-prof is a bare flag; --cpu-prof-dir
    // uses = syntax. If --cpu-prof isn't recognized, no profile is written.
    using dir = tempDir("fun-options-cpu-prof", {});

    const result = spawnSync({
      cmd: [funExe(), "-e", "1"],
      env: {
        ...funEnv,
        FUN_OPTIONS: `--cpu-prof --cpu-prof-dir=${dir}`,
      },
    });

    expect(result.exitCode).toBe(0);

    // --cpu-prof should have produced a .cpuprofile file in the dir
    const files = readdirSync(String(dir));
    const cpuProfiles = files.filter((f: string) => f.endsWith(".cpuprofile"));
    expect(cpuProfiles.length).toBeGreaterThanOrEqual(1);
  });

  test("bare flag before flag with value is recognized (standalone executable)", () => {
    // Same test as above but with a compiled standalone executable.
    using dir = tempDir("fun-options-cpu-prof-compile", {
      "entry.ts": "console.log('ok');",
    });

    const exePath = String(dir) + "/app";
    const profDir = String(dir) + "/profiles";

    // Compile
    const build = spawnSync({
      cmd: [funExe(), "build", "--compile", String(dir) + "/entry.ts", "--outfile", exePath],
      env: funEnv,
    });
    expect(build.exitCode).toBe(0);

    // Run with FUN_OPTIONS
    const result = spawnSync({
      cmd: [exePath],
      env: {
        ...funEnv,
        FUN_OPTIONS: `--cpu-prof --cpu-prof-dir=${profDir}`,
      },
    });

    expect(result.stdout.toString()).toContain("ok");
    expect(result.exitCode).toBe(0);

    const files = readdirSync(profDir);
    const cpuProfiles = files.filter((f: string) => f.endsWith(".cpuprofile"));
    expect(cpuProfiles.length).toBeGreaterThanOrEqual(1);
  });

  test("empty FUN_OPTIONS - should work normally", () => {
    const result = spawnSync({
      cmd: [funExe(), "--print='NORMAL'"],
      env: {
        ...funEnv,
        FUN_OPTIONS: "",
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("NORMAL");
  });
});
