import { expect, test } from "fun:test";
import { funEnv, funExe, normalizeFunSnapshot, tempDir } from "harness";

test.concurrent("only-failures flag should show only failures", async () => {
  const result = await Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/only-failures.fixture.ts", "--only-failures"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();
  expect({
    exitCode,
    stdout: normalizeFunSnapshot(stdout),
    stderr: normalizeFunSnapshot(stderr),
  }).toMatchInlineSnapshot(`
    {
      "exitCode": 1,
      "stderr": 
    "test/js/fun/test/only-failures.fixture.ts:
     7 | test("passing test 2", () => {
     8 |   expect(2 + 2).toBe(4);
     9 | });
    10 | 
    11 | test("failing test", () => {
    12 |   expect(1 + 1).toBe(3);
                         ^
    error: expect(received).toBe(expected)

    Expected: 3
    Received: 2
        at <anonymous> (file:NN:NN)
    (fail) failing test
    21 | });
    22 | 
    23 | test.todo("todo test");
    24 | 
    25 | test("another failing test", () => {
    26 |   throw new Error("This test fails");
                                            ^
    error: This test fails
        at <anonymous> (file:NN:NN)
    (fail) another failing test

     3 pass
     1 skip
     1 todo
     2 fail
     4 expect() calls
    Ran 7 tests across 1 file."
    ,
      "stdout": "fun test <version> (<revision>)",
    }
  `);
});

test.concurrent("only-failures flag should work with multiple files", async () => {
  const result = await Fun.spawn({
    cmd: [
      funExe(),
      "test",
      import.meta.dir + "/printing/dots/dots1.fixture.ts",
      import.meta.dir + "/only-failures.fixture.ts",
      "--only-failures",
    ],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();
  expect(exitCode).toBe(1);
  expect(normalizeFunSnapshot(stderr)).toContain("(fail) failing test");
  expect(normalizeFunSnapshot(stderr)).toContain("(fail) another failing test");
  expect(normalizeFunSnapshot(stderr)).not.toContain("(pass)");
});

test.concurrent("only-failures should work via funfig.toml", async () => {
  using dir = tempDir("funfig-only-failures", {
    "funfig.toml": `
[test]
onlyFailures = true
`,
    "my.test.ts": `
import { test, expect } from "fun:test";

test("passing test", () => {
  expect(1 + 1).toBe(2);
});

test("failing test", () => {
  expect(1 + 1).toBe(3);
});

test("another passing test", () => {
  expect(true).toBe(true);
});
`,
  });

  const result = await Fun.spawn({
    cmd: [funExe(), "test"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
    cwd: String(dir),
  });

  const exitCode = await result.exited;
  const stderr = await result.stderr.text();

  expect(exitCode).toBe(1);
  // Should only show the failing test
  expect(normalizeFunSnapshot(stderr, dir)).toContain("(fail) failing test");
  // Should not show passing tests
  expect(normalizeFunSnapshot(stderr, dir)).not.toContain("(pass)");
});
