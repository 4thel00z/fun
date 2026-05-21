// https://github.com/underdoc-org/fun/issues/23275
// UTF-8 BOM in funfig.toml should not cause parsing errors

import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("funfig.toml with UTF-8 BOM should parse correctly", async () => {
  // UTF-8 BOM is the byte sequence: 0xEF 0xBB 0xBF
  const utf8BOM = "\uFEFF";

  using dir = tempDir("funfig-bom", {
    "funfig.toml":
      utf8BOM +
      `
[install]
exact = true
`,
    "index.ts": `console.log("test");`,
    "package.json": JSON.stringify({
      name: "test-bom",
      version: "1.0.0",
    }),
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "index.ts"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should not have the "Unexpected" error that was reported in the issue
  expect(stderr).not.toContain("Unexpected");
  expect(stderr).not.toContain("error:");
  expect(stdout).toContain("test");
  expect(exitCode).toBe(0);
});

test("funfig.toml without BOM should still work", async () => {
  using dir = tempDir("funfig-no-bom", {
    "funfig.toml": `
[install]
exact = true
`,
    "index.ts": `console.log("test");`,
    "package.json": JSON.stringify({
      name: "test-no-bom",
      version: "1.0.0",
    }),
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "index.ts"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).not.toContain("Unexpected");
  expect(stderr).not.toContain("error:");
  expect(stdout).toContain("test");
  expect(exitCode).toBe(0);
});

test("funfig.toml with BOM and actual content should parse the content correctly", async () => {
  const utf8BOM = "\uFEFF";

  using dir = tempDir("funfig-bom-content", {
    "funfig.toml":
      utf8BOM +
      `
logLevel = "debug"

[install]
production = true
`,
    "index.ts": `console.log("hello");`,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "index.ts"],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("hello");
  expect(stderr).not.toContain("Unexpected");
  expect(exitCode).toBe(0);
});
