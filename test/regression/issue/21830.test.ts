import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";

// make sure beforeAll runs in the right order
test("21830", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/21830.fixture.ts"],
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
    Create Show Tests pre
    Create Show Tests post
    Get Show Data Tests pre
    Get Show Data Tests post
    Show Deletion Tests pre 
    Show Deletion test post"
  `);
});
