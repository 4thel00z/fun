import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("--pass-with-no-tests exits with 0 when no test files found", async () => {
  using dir = tempDir("pass-with-no-tests", {
    "not-a-test.ts": `console.log("hello");`,
  });

  const { exited, stderr } = Fun.spawn({
    cmd: [funExe(), "test", "--pass-with-no-tests"],
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  const [err, exitCode] = await Promise.all([stderr.text(), exited]);

  expect(exitCode).toBe(0);
  expect(err).toContain("No tests found!");
});

test("--pass-with-no-tests exits with 0 when filters match no tests", async () => {
  using dir = tempDir("pass-with-no-tests-filter", {
    "some.test.ts": `import { test } from "fun:test"; test("example", () => {});`,
  });

  const { exited, stderr } = Fun.spawn({
    cmd: [funExe(), "test", "--pass-with-no-tests", "-t", "nonexistent"],
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  const [err, exitCode] = await Promise.all([stderr.text(), exited]);

  expect(exitCode).toBe(0);
});

test("without --pass-with-no-tests, exits with 1 when no test files found", async () => {
  using dir = tempDir("fail-with-no-tests", {
    "not-a-test.ts": `console.log("hello");`,
  });

  const { exited, stderr } = Fun.spawn({
    cmd: [funExe(), "test"],
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  const [err, exitCode] = await Promise.all([stderr.text(), exited]);

  expect(exitCode).toBe(1);
  expect(err).toContain("No tests found!");
});

test("without --pass-with-no-tests, exits with 1 when filters match no tests", async () => {
  using dir = tempDir("fail-with-no-tests-filter", {
    "some.test.ts": `import { test } from "fun:test"; test("example", () => {});`,
  });

  const { exited } = Fun.spawn({
    cmd: [funExe(), "test", "-t", "nonexistent"],
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  const exitCode = await exited;

  expect(exitCode).toBe(1);
});

test("--pass-with-no-tests still fails when tests fail", async () => {
  using dir = tempDir("pass-with-no-tests-but-fail", {
    "test.test.ts": `import { test, expect } from "fun:test"; test("failing", () => { expect(1).toBe(2); });`,
  });

  const { exited } = Fun.spawn({
    cmd: [funExe(), "test", "--pass-with-no-tests"],
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: funEnv,
  });

  const exitCode = await exited;

  expect(exitCode).toBe(1);
});
