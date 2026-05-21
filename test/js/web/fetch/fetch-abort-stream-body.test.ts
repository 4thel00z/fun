import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "node:path";

test("aborting fetch with a ReadableStream request body does not double-cancel the sink", async () => {
  await using proc = Fun.spawn({
    cmd: [funExe(), join(import.meta.dir, "fetch-abort-stream-body-fixture.ts")],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toBe("");
  expect(stdout).toBe("done 50\n");
  expect(exitCode).toBe(0);
});
