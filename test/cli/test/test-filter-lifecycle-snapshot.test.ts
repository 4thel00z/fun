import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot } from "harness";
import { join } from "node:path";

test("snapshot", () => {
  const { stdout, stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), "test", join(import.meta.dirname, "test-filter-lifecycle.js"), "-t", "should run test"],
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  expect(normalizeFunSnapshot(stdout.toString() + stderr.toString())).toMatchInlineSnapshot(`
    "fun test <version> (<revision>)
    <parent beforeAll>
    <beforeAll>
    <parent beforeEach>
    <beforeEach>
    <test 1>
    <afterEach>
    <parent afterEach>
    <parent beforeEach>
    <beforeEach>
    <test 2>
    <afterEach>
    <parent afterEach>
    <afterAll>
    <parent afterAll>

    test/cli/test/test-filter-lifecycle.js:
    (pass) parent > should run > test
    (pass) parent > should run > test 2

     2 pass
     4 filtered out
     0 fail
    Ran 2 tests across 1 file."
  `);
  expect(exitCode).toBe(0);
});
