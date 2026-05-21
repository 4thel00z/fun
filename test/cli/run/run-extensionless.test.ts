import { describe, expect, test } from "fun:test";
import { mkdirSync, writeFileSync } from "fs";
import { funEnv, funExe, isWindows, tmpdirSync } from "harness";
import { join } from "path";

describe.concurrent("run-extensionless", () => {
  test("running extensionless file works", async () => {
    const dir = tmpdirSync();
    mkdirSync(dir, { recursive: true });
    await Fun.write(join(dir, "cool"), "const x: Test = 2; console.log('hello world');");
    await using proc = Fun.spawn({
      cmd: [funExe(), join(dir, "./cool")],
      cwd: dir,
      env: funEnv,
      stdout: "pipe",
    });
    const stdout = await proc.stdout.text();
    expect(stdout).toEqual("hello world\n");
  });

  test.skipIf(isWindows)("running shebang typescript file works", async () => {
    const dir = tmpdirSync();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "cool"), `#!${funExe()}\nconst x: Test = 2; console.log('hello world');`, { mode: 0o777 });

    await using proc = Fun.spawn({
      cmd: [join(dir, "./cool")],
      cwd: dir,
      env: funEnv,
      stdout: "pipe",
    });
    const stdout = await proc.stdout.text();
    expect(stdout).toEqual("hello world\n");
  });
});
