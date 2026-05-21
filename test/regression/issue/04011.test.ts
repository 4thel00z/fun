import { describe, expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

describe.concurrent("issue/04011", () => {
  test("running a missing script should return non zero exit code", async () => {
    await using proc = Fun.spawn({
      cmd: [funExe(), "run", "missing.ts"],
      env: funEnv,
      stderr: "inherit",
      stdout: "pipe",
    });

    expect(await proc.exited).toBe(1);
  });
});
