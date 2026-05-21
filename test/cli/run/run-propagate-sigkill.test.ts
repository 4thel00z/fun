// `fun run <script>` re-raises the child's terminating signal via
// `Global.raiseIgnoringPanicHandler`, which first resets the signal's
// disposition with `fun.sys.sigaction(sig, …)`. `SIGKILL`/`SIGSTOP` can't
// have their disposition changed, so libc returns `EINVAL` there — that
// must not reach `std.posix.sigaction`'s `else => unreachable`.
import { expect, test } from "fun:test";
import { funEnv, funExe, isPosix, tempDir } from "harness";

test.skipIf(!isPosix)("fun run propagates SIGKILL from a child without hitting unreachable", async () => {
  using dir = tempDir("run-sigkill", {
    "package.json": JSON.stringify({
      name: "t",
      scripts: { go: `${funExe()} -e 'process.kill(process.pid, "SIGKILL")'` },
    }),
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), "run", "go"],
    env: funEnv,
    cwd: String(dir),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // The outer `fun run` must itself die by SIGKILL re-raised from the child.
  // If `fun.sys.sigaction` routed through `std.posix.sigaction`'s
  // `else => unreachable`, this would be SIGILL (debug) or undefined.
  expect(stderr).toContain("SIGKILL");
  expect(stdout).toBe("");
  expect(proc.signalCode).toBe("SIGKILL");
  expect(exitCode).not.toBe(0);
});
