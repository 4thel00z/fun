// https://github.com/underdoc-org/fun/issues/26337
// Test that `fun install` with a stale lockfile that has a `file:` dependency path
// that differs from the package.json shows a helpful error message indicating which
// dependency caused the issue, rather than the misleading "Fun could not find a
// package.json file to install from" error.

import { describe, expect, it } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

describe("issue #26337 - missing file: dependency error should show dependency name", () => {
  it("should show which dependency path is missing when lockfile has stale file: path", async () => {
    // Create a workspace with a valid file: dependency
    using dir = tempDir("issue-26337", {
      "package.json": JSON.stringify({
        name: "repro",
        dependencies: {
          "@scope/dep": "file:./packages/@scope/dep",
        },
      }),
      "packages/@scope/dep/package.json": JSON.stringify({
        name: "@scope/dep",
        version: "1.0.0",
      }),
    });

    // First install to create a lockfile with the valid path
    await using installProc = Fun.spawn({
      cmd: [funExe(), "install"],
      cwd: String(dir),
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Consume streams to prevent buffer filling
    const [, , installExitCode] = await Promise.all([
      installProc.stdout.text(),
      installProc.stderr.text(),
      installProc.exited,
    ]);
    expect(installExitCode).toBe(0);

    // Now update the package.json to point to a non-existent path
    // This creates the stale lockfile scenario
    await Fun.write(
      `${dir}/package.json`,
      JSON.stringify({
        name: "repro",
        dependencies: {
          "@scope/dep": "file:./nonexistent/path",
        },
      }),
    );

    // Run fun install again - this should show a helpful error
    await using failProc = Fun.spawn({
      cmd: [funExe(), "install"],
      cwd: String(dir),
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      failProc.stdout.text(),
      failProc.stderr.text(),
      failProc.exited,
    ]);

    // The error output should mention the dependency name and path
    const output = stdout + stderr;
    expect(output).toContain("@scope/dep");
    expect(output).toContain("file:./nonexistent/path");
    expect(output).toContain("failed to resolve");

    // The install should fail
    expect(exitCode).toBe(1);
  });
});
