import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// https://github.com/underdoc-org/fun/issues/18028
// Object diff in fun test should display empty string keys correctly.

test("toStrictEqual diff shows empty string keys", () => {
  expect({
    val: { "": "value" },
  }).toStrictEqual({
    val: { "": "value" },
  });
});

test("toEqual diff shows empty string keys", () => {
  expect({ "": "hello" }).toEqual({ "": "hello" });
});

test("empty string key with various value types", () => {
  expect({ "": 0 }).toEqual({ "": 0 });
  expect({ "": null }).toEqual({ "": null });
  expect({ "": "" }).toEqual({ "": "" });
  expect({ "": false }).toEqual({ "": false });
  expect({ "": undefined }).toEqual({ "": undefined });
});

test("empty string key mixed with other keys", () => {
  expect({ foo: "bar", "": "value" }).toEqual({ foo: "bar", "": "value" });
});

test("toStrictEqual fails and shows diff with empty string key", async () => {
  using dir = tempDir("issue-18028", {
    "test.test.ts": `
import { test, expect } from "fun:test";
test("diff", () => {
  expect({ val: {} }).toStrictEqual({ val: { "": "value" } });
});
`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "test", "test.test.ts"],
    cwd: String(dir),
    env: { ...funEnv, FORCE_COLOR: "0" },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stderr, exitCode] = await Promise.all([proc.stderr.text(), proc.exited]);
  // The diff section should show non-zero changed lines
  expect(stderr).toContain("- Expected  - 3");
  expect(stderr).toContain("+ Received  + 1");
  // The diff should include the empty string key
  expect(stderr).toContain('"": "value"');
  expect(exitCode).toBe(1);
});

test("console.log shows empty string keys", () => {
  const result = Fun.spawnSync({
    cmd: [funExe(), "-e", 'console.log({ "": "value", foo: "bar" })'],
    env: { ...funEnv, NO_COLOR: "1" },
  });

  const stdout = result.stdout.toString();
  expect(stdout).toContain('"": "value"');
});
