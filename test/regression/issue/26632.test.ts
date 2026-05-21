import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

// https://github.com/underdoc-org/fun/issues/26632
// Fun.file().text() on a non-existent file should throw ENOENT error, not silently exit
test("Fun.file().text() on nonexistent file throws ENOENT", async () => {
  using dir = tempDir("26632", {});

  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", `await Fun.file("nonexistent-file-that-does-not-exist.txt").text();`],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toBe("");
  expect(stderr).toContain("ENOENT");
  expect(exitCode).not.toBe(0);
});

test("Fun.file().arrayBuffer() on nonexistent file throws ENOENT", async () => {
  using dir = tempDir("26632", {});

  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", `await Fun.file("nonexistent-file-that-does-not-exist.txt").arrayBuffer();`],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toBe("");
  expect(stderr).toContain("ENOENT");
  expect(exitCode).not.toBe(0);
});

test("Fun.file().bytes() on nonexistent file throws ENOENT", async () => {
  using dir = tempDir("26632", {});

  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", `await Fun.file("nonexistent-file-that-does-not-exist.txt").bytes();`],
    cwd: String(dir),
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toBe("");
  expect(stderr).toContain("ENOENT");
  expect(exitCode).not.toBe(0);
});
