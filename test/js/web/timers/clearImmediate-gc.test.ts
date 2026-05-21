import { expect, it } from "fun:test";
import { funEnv, funExe } from "harness";

it("clearImmediate then GC does not crash when the queued immediate is skipped", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
        clearImmediate(setImmediate(() => {}));
        Fun.gc(true);
        setTimeout(() => {}, 1);
      `,
    ],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  const stderrLines = stderr
    .split("\n")
    .filter(l => l && !l.startsWith("WARNING: ASAN interferes"))
    .join("\n");
  expect(stderrLines).toBe("");
  expect(stdout).toBe("");
  expect(exitCode).toBe(0);
});
