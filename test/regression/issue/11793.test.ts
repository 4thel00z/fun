import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("11793", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/11793.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(1);
  expect(normalizeFunSnapshot(stderr)).toMatchInlineSnapshot(`
    "test/regression/issue/11793.fixture.ts:
    1 | const { test, expect } = require("fun:test");
    2 | 
    3 | test.each([[]])("%p", array => {
    4 |   expect(array.length).toBe(0);
                               ^
    error: expect(received).toBe(expected)

    Expected: 0
    Received: 1
        at <anonymous> (file:NN:NN)
    (fail) %p

     0 pass
     1 fail
     1 expect() calls
    Ran 1 test across 1 file."
  `);
});
