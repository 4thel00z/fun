import { describe, expect, it } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

describe.concurrent("jsx-symbol-collision", () => {
  it("should not have a symbol collision with jsx imports", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "--fun", join(import.meta.dir, "jsx-collision.tsx")],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);
    expect(stdout).toBe("[Function: Fragment]\n");
    expect(stderr).toBeEmpty();
    expect(exitCode).toBe(0);
  });
});
