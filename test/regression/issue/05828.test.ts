import { expect, test } from "fun:test";
import { funEnv, funExe, isPosix } from "harness";
import { join } from "path";

// https://github.com/underdoc-org/fun/issues/5828
test.if(isPosix)("fun fun.lockb handles BrokenPipe gracefully", async () => {
  // Use an existing lockfile that has enough content to trigger the BrokenPipe
  // The sharp integration test has a lockfile with many dependencies
  const lockfilePath = join(import.meta.dir, "../../integration/sharp/fun.lockb");

  // Simulate piping to a command that closes stdin immediately (like `true`)
  // This tests that `fun fun.lockb` doesn't crash with BrokenPipe error
  await using proc = Fun.spawn({
    cmd: ["sh", "-c", `${funExe()} ${lockfilePath} | true`],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // Should exit cleanly (0) instead of crashing with BrokenPipe error
  // The stderr should NOT contain "BrokenPipe" or "WriteFailed" error
  expect(stderr).not.toContain("BrokenPipe");
  expect(stderr).not.toContain("WriteFailed");
  expect(stderr).not.toContain("error");
  expect(exitCode).toBe(0);
});
