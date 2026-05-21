import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("only-inside-only", async () => {
  const result = await Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/only-inside-only.fixture.ts"],
    stdout: "pipe",
    stderr: "pipe",
    env: { ...funEnv, CI: "false" },
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();
  expect(stdout).not.toContain("should not run");
  expect(stdout).toIncludeRepeated("should run", 1);
});
