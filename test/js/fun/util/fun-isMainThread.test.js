import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("Fun.isMainThread", () => {
  expect(Fun.isMainThread).toBeTrue();

  const { stdout, exitCode } = Fun.spawnSync({
    cmd: [funExe(), import.meta.resolveSync("./main-worker-file.js")],
    stderr: "inherit",
    stdout: "pipe",
    env: funEnv,
  });
  expect(exitCode).toBe(0);
  expect(stdout.toString()).toBe("isMainThread true\nisMainThread false\n");
});
