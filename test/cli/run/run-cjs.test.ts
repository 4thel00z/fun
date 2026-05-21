import { describe, expect, test } from "fun:test";
import { mkdirSync } from "fs";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

describe.concurrent("run-cjs", () => {
  test("running a commonjs module works", async () => {
    const dir = tmpdirSync();
    mkdirSync(dir, { recursive: true });
    await Fun.write(join(dir, "index1.js"), "module.exports = 1; console.log('hello world');");
    await using proc = Fun.spawn({
      cmd: [funExe(), join(dir, "index1.js")],
      cwd: dir,
      env: funEnv,
      stdout: "pipe",
    });
    const stdout = await proc.stdout.text();
    expect(stdout).toEqual("hello world\n");
  });
});
