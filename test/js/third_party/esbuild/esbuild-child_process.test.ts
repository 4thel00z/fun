import { spawnSync } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("esbuild", () => {
  const { exitCode } = spawnSync([funExe(), import.meta.dir + "/esbuild-test.js"], {
    env: {
      ...funEnv,
    },
    detached: true,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  expect(exitCode).toBe(0);
});
