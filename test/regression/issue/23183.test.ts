// https://github.com/underdoc-org/fun/issues/23183
// Test that accessing process.title doesn't crash on Windows
import { expect, test } from "fun:test";
import { funEnv, funExe, isWindows } from "harness";

test("process.title should not crash on Windows", async () => {
  const proc = Fun.spawn({
    cmd: [funExe(), "-e", "console.log(typeof process.title)"],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    Fun.readableStreamToText(proc.stdout),
    Fun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout.trim()).toBe("string");
});

test("process.title should return a non-empty string or fallback to 'fun'", async () => {
  const proc = Fun.spawn({
    cmd: [funExe(), "-e", "console.log(process.title)"],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    Fun.readableStreamToText(proc.stdout),
    Fun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  const title = stdout.trim();
  expect(title.length).toBeGreaterThan(0);
  if (isWindows) {
    // On Windows, we should get either a valid console title or "fun"
    expect(typeof title).toBe("string");
  } else {
    expect(title).toBe("fun");
  }
});
