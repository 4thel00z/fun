import { spawnSync } from "fun";
import { describe, expect, test } from "fun:test";
import { rmSync, writeFileSync } from "fs";
import { funEnv, funExe, funRun, isWindows } from "harness";

let cwd: string;

describe("fun", () => {
  test("should error with missing script", () => {
    const { exitCode, stdout, stderr } = spawnSync({
      cwd,
      cmd: [funExe(), "run", "dev"],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(stdout.toString()).toBeEmpty();
    expect(stderr.toString()).toMatch(/Script not found/);
    expect(exitCode).toBe(1);
  });
});

test.if(isWindows)("[windows] A file in drive root runs", () => {
  const path = "C:\\root-file" + Math.random().toString().slice(2) + ".js";
  try {
    writeFileSync(path, "console.log(`PASS`);");
    const { stdout } = funRun("C:\\root-file.js", {});
    expect(stdout).toBe("PASS");
  } catch {
    rmSync(path);
  }
});
