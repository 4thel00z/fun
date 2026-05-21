import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("parsing npm aliases without package manager does not crash", () => {
  // Easiest way to repro this regression with `funx funbunbunbunfun@npm:another-fun@1.0.0`. The package
  // doesn't need to exist, we just need `funx` to parse the package version.
  const { stdout, stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), "x", "funbunbunbunfun@npm:another-fun@1.0.0"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  expect(exitCode).toBe(1);
  expect(stderr.toString()).toContain("error: funbunbunbunfun@npm:another-fun@1.0.0 failed to resolve");
  expect(stdout.toString()).toBe("");
});
