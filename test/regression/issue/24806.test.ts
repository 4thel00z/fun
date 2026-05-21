import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("fun publish --help shows correct message for --dry-run", async () => {
  await using proc = Fun.spawn({
    cmd: [funExe(), "publish", "--help"],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  // The --dry-run flag should have a generic description that works for all commands
  // It should NOT say "Don't install anything" when used with "fun publish"
  expect(stdout).toContain("--dry-run");
  expect(stdout).toContain("Perform a dry run without making changes");

  // Make sure it doesn't contain the old incorrect message
  expect(stdout).not.toContain("Don't install anything");

  expect(exitCode).toBe(0);
});
