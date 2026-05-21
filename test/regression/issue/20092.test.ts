import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("20092", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/20092.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...funEnv, CI: "false" }, // tests '.only()'
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(0);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "test/regression/issue/20092.fixture.ts:
    (pass) foo > works
    (pass) bar > works

     2 pass
     0 fail
     2 expect() calls
    Ran 2 tests across 1 file."
  `);
});
