import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";
import { join } from "path";

test("Invalid escape sequence \\x in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\x41 = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain("const \\x41 = 1;");
  expect(err).toContain("error: Unexpected escape sequence");
  expect(err).toContain(":1:7");
});

test("Invalid escaped double quote in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\" = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain('const \\" = 1;');
  expect(err).toContain("error: Unexpected escaped double quote");
  expect(err).toContain(":1:7");
});

test("Invalid escaped single quote in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\' = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain("const \\' = 1;");
  expect(err).toContain("error: Unexpected escaped single quote");
  expect(err).toContain(":1:7");
});

test("Invalid escaped backtick in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\\` = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain("const \\\` = 1;");
  expect(err).toContain("error: Unexpected escaped backtick");
  expect(err).toContain(":1:7");
});

test("Invalid escaped backslash in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\\\ = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain("const \\\\ = 1;");
  expect(err).toContain("error: Unexpected escaped backslash");
  expect(err).toContain(":1:7");
});

test("Invalid escaped z in identifier shows helpful error message", async () => {
  using dir = tempDir("escape-test", {
    "test.js": `const \\z = 1;`,
  });

  const { stderr, exitCode } = Fun.spawnSync({
    cmd: [funExe(), join(dir, "test.js")],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
    cwd: String(dir),
  });

  expect(exitCode).toBe(1);
  const err = stderr.toString();
  expect(err).toContain("const \\z = 1;");
  expect(err).toContain("error: Unexpected escape sequence");
  expect(err).toContain(":1:7");
});

test("Valid unicode escapes in identifiers should work", async () => {
  // Test valid \u escape with 4 hex digits
  {
    using dir = tempDir("escape-test", {
      "valid1.js": `const \\u0041 = 1; console.log(A);`,
    });

    const { stdout, exitCode } = Fun.spawnSync({
      cmd: [funExe(), join(dir, "valid1.js")],
      env: funEnv,
      stderr: "pipe",
      stdout: "pipe",
      cwd: String(dir),
    });

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toBe("1\n");
  }

  // Test valid \u{} escape with variable length
  {
    using dir = tempDir("escape-test", {
      "valid2.js": `const \\u{41} = 2; console.log(A);`,
    });

    const { stdout, exitCode } = Fun.spawnSync({
      cmd: [funExe(), join(dir, "valid2.js")],
      env: funEnv,
      stderr: "pipe",
      stdout: "pipe",
      cwd: String(dir),
    });

    expect(exitCode).toBe(0);
    expect(stdout.toString()).toBe("2\n");
  }
});
