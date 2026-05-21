import { describe, expect, it } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

describe.concurrent("empty-file", () => {
  it("should execute empty scripts", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "--fun", join(import.meta.dir, "empty-file.js")],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout).toBeEmpty();
    expect(stderr).toBeEmpty();
    expect(exitCode).toBe(0);
  });
});
