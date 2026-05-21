import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

test("20100", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/20100.fixture.ts"],
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
    <top-level>
      <top-level-test> { unpredictableVar: "top level" } </top-level-test>
      <describe-1>
        <describe-1-test> { unpredictableVar: "describe 1" } </describe-1-test>
      </describe-1>
      <describe-2>
        <describe-2-test> { unpredictableVar: "describe 2" } </describe-2-test>
      </describe-2>
    </top-level>"
  `);
});
