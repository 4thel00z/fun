import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("19875", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/19875.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...funEnv, CI: "false" }, // tests '.only()'
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(0);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "test/regression/issue/19875.fixture.ts:
    (todo) only > todo > fail

     0 pass
     1 todo
     0 fail
    Ran 1 test across 1 file."
  `);
});
