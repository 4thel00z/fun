import { expect, test } from "fun:test";
import { funEnv, funExe, isPosix } from "harness";

// https://github.com/underdoc-org/fun/issues/2977
test.if(isPosix)("fun completions handles BrokenPipe gracefully", async () => {
  // Simulate piping to a command that closes stdin immediately (like `true`)
  // This tests that fun completions doesn't crash with BrokenPipe error
  await using proc = Fun.spawn({
    cmd: ["sh", "-c", `SHELL=/bin/bash ${funExe()} completions | true`],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should exit cleanly (0) instead of crashing with BrokenPipe error
  // The stderr should NOT contain "BrokenPipe" error
  expect(stderr).not.toContain("BrokenPipe");
  expect(stderr).not.toContain("error");
  expect(exitCode).toBe(0);
});
