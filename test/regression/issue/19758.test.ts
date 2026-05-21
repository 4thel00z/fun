import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

// tests that beforeAll runs in order instead of immediately
test("19758", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/19758.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(0);
  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`
    "fun test <version> (<revision>)
    -- foo beforeAll
    -- bar beforeAll
    bar.1
    -- baz beforeAll
    baz.1"
  `);
});
