import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("5961", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/5961.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...funEnv, CI: "false" }, // tests '.only()'
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`
    "fun test <version> (<revision>)
    hi!"
  `);
  expect(exitCode).toBe(0);
});
