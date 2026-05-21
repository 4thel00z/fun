import { spawn } from "fun";
import { expect, it } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "node:path";

it("does not hang", async () => {
  const subprocess = spawn({
    cmd: [funExe(), "test", join(import.meta.dirname, "job-object-bug.ts")],
    env: funEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await subprocess.stdout.text();
  expect(await subprocess.exited).toBe(0);
});
