import { describe, expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

describe.concurrent("commonjs-no-export", () => {
  test("CommonJS entry point with no exports", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "--fun", join(import.meta.dir, "commonjs-no-exports-fixture.js")],
      env: funEnv,
      stderr: "inherit",
      stdout: "pipe",
    });

    const [stdout, exitCode] = await Promise.all([proc.stdout.text(), proc.exited]);

    expect(stdout.trim().endsWith("--pass--")).toBe(true);
    expect(exitCode).toBe(0);
  });
});
