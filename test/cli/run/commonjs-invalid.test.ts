import { describe, expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

describe.concurrent("commonjs-invalid", () => {
  test("Loading an invalid commonjs module", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", join(import.meta.dir, "cjs-fixture-bad.cjs")],
      env: funEnv,
      stdout: "inherit",
      stderr: "pipe",
      stdin: "inherit",
    });

    const [stderr, exitCode] = await Promise.all([proc.stderr.text(), proc.exited]);

    expect(stderr.trim()).toContain("Expected CommonJS module to have a function wrapper");
    expect(exitCode).toBe(1);
  });
});
