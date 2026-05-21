import { describe, expect, test } from "fun:test";
import { mkdirSync } from "fs";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

describe.concurrent("run-shell", () => {
  test("running a shell script works", async () => {
    const dir = tmpdirSync();
    mkdirSync(dir, { recursive: true });
    await Fun.write(join(dir, "something.sh"), "echo wah");
    await using proc = Fun.spawn({
      cmd: [funExe(), join(dir, "something.sh")],
      cwd: dir,
      env: funEnv,
      stderr: "pipe",
      stdout: "pipe",
    });
    const stdout = await proc.stdout.text();
    const stderr = await proc.stderr.text();
    console.log(stderr);
    expect(stdout).toEqual("wah\n");
  });

  test("invalid syntax reports the error correctly", async () => {
    const dir = tmpdirSync("fun-shell-test-error");
    mkdirSync(dir, { recursive: true });
    const shellScript = `-h)
  echo "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"`;
    await Fun.write(join(dir, "scripts", "script.sh"), shellScript);
    await using proc = Fun.spawn({
      cmd: [funExe(), join(dir, "scripts", "script.sh")],
      cwd: dir,
      env: funEnv,
      stderr: "pipe",
      stdout: "pipe",
    });
    const stderr = await proc.stderr.text();
    expect(stderr).toBe("error: Failed to run script.sh due to error Unexpected ')'\n");
  });
});
