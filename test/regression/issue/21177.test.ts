import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("21177", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/21177.fixture.ts", "-t", "true is true"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`"fun test <version> (<revision>)"`);
  expect(exitCode).toBe(0);
});

test("21177", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/21177.fixture-2.ts", "-t", "middle is middle"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();

  expect(normalizeFunSnapshot(stdout)).toMatchInlineSnapshot(`
    "fun test <version> (<revision>)
    Running beforeAll in Outer describe
    Running beforeAll in Middle describe"
  `);
  expect(exitCode).toBe(0);
});
