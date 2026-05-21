// Test for GitHub issue #26058: fun repl is slow
// This test verifies that `fun repl` now uses a built-in REPL instead of funx fun-repl

import { spawnSync } from "fun";
import { describe, expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

describe("issue #26058 - fun repl startup time", () => {
  test("fun repl starts without downloading packages", () => {
    // The key indicator that funx is being used is the "Resolving dependencies" message
    // Our built-in REPL should not print this

    // Use timeout to prevent hanging since REPL requires TTY for interactive input
    const result = spawnSync({
      cmd: [funExe(), "repl"],
      env: {
        ...funEnv,
        TERM: "dumb",
      },
      stderr: "pipe",
      stdout: "pipe",
      stdin: "ignore",
      timeout: 3000,
    });

    const stderr = result.stderr?.toString() || "";
    const stdout = result.stdout?.toString() || "";

    // Should NOT see package manager output from funx
    expect(stderr).not.toContain("Resolving dependencies");
    expect(stderr).not.toContain("fun add");
    expect(stdout).not.toContain("Resolving dependencies");

    // The built-in REPL should print "Welcome to Fun" when starting
    // Even without a TTY, the welcome message should appear in stdout
    expect(stdout).toContain("Welcome to Fun");
  });
});
