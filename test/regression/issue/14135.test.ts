import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("14135", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/14135.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...funEnv, CI: "false" }, // tests '.only()'
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(0);
  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`
    "fun test <version> (<revision>)
    beforeAll 2
    test 2"
  `);
});
