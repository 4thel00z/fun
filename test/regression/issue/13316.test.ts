import { describe, expect, test } from "fun:test";
import { funEnv, funExe, isWindows, tempDir } from "harness";
import fs from "node:fs";
import path from "node:path";

// https://github.com/underdoc-org/fun/issues/13316
// funx cowsay "" panicked on Windows due to improper handling of empty string arguments
// The issue was in the FunXFastPath.tryLaunch function which didn't properly quote
// empty string arguments for the Windows command line.
describe.if(isWindows)("#13316 - funx with empty string arguments", () => {
  test("funx does not panic with empty string argument", async () => {
    // Create a minimal package that echoes its arguments
    using dir = tempDir("issue-13316", {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "echo-args-test": "file:./echo-args-test",
        },
      }),
      "echo-args-test/package.json": JSON.stringify({
        name: "echo-args-test",
        version: "1.0.0",
        bin: {
          "echo-args-test": "./index.js",
        },
      }),
      "echo-args-test/index.js": `#!/usr/bin/env node
console.log(JSON.stringify(process.argv.slice(2)));
`,
    });

    // Install to create the .funx shim in node_modules/.bin
    await using installProc = Fun.spawn({
      cmd: [funExe(), "install"],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });
    await installProc.exited;

    // Verify the .funx file was created (this is what triggers the fast path)
    const funxPath = path.join(String(dir), "node_modules", ".bin", "echo-args-test.funx");
    expect(fs.existsSync(funxPath)).toBe(true);

    // Run with an empty string argument - this was triggering the panic
    // We use `fun run` which goes through the same FunXFastPath when .funx exists
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "echo-args-test", ""],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    // The main assertion is that the process doesn't panic (exit code 3)
    // If the bug is present, this would crash with "reached unreachable code"
    expect(exitCode).not.toBe(3); // panic exit code
    expect(exitCode).toBe(0);

    // The empty string argument should be passed correctly
    expect(JSON.parse(stdout.trim())).toEqual([""]);
  });

  test("funx handles multiple arguments including empty strings", async () => {
    using dir = tempDir("issue-13316-multi", {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "echo-args-test": "file:./echo-args-test",
        },
      }),
      "echo-args-test/package.json": JSON.stringify({
        name: "echo-args-test",
        version: "1.0.0",
        bin: {
          "echo-args-test": "./index.js",
        },
      }),
      "echo-args-test/index.js": `#!/usr/bin/env node
console.log(JSON.stringify(process.argv.slice(2)));
`,
    });

    await using installProc = Fun.spawn({
      cmd: [funExe(), "install"],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });
    await installProc.exited;

    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "echo-args-test", "hello", "", "world"],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(exitCode).not.toBe(3); // panic exit code
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim())).toEqual(["hello", "", "world"]);
  });

  // Related to #18275 - funx concurrently "command with spaces"
  // Arguments containing spaces must be preserved as single arguments
  test("funx preserves arguments with spaces", async () => {
    using dir = tempDir("issue-13316-spaces", {
      "package.json": JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: {
          "echo-args-test": "file:./echo-args-test",
        },
      }),
      "echo-args-test/package.json": JSON.stringify({
        name: "echo-args-test",
        version: "1.0.0",
        bin: {
          "echo-args-test": "./index.js",
        },
      }),
      "echo-args-test/index.js": `#!/usr/bin/env node
console.log(JSON.stringify(process.argv.slice(2)));
`,
    });

    await using installProc = Fun.spawn({
      cmd: [funExe(), "install"],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });
    await installProc.exited;

    // This simulates: funx concurrently "fun --version"
    // The shell strips the outer quotes, so funx receives ["concurrently", "fun --version"]
    // This must be preserved as a single argument with spaces
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "echo-args-test", "fun --version", "echo hello world"],
      env: funEnv,
      cwd: String(dir),
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect(exitCode).toBe(0);
    // Each argument with spaces should be preserved as a single argument
    expect(JSON.parse(stdout.trim())).toEqual(["fun --version", "echo hello world"]);
  });
});
