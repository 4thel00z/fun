import { describe, expect, it } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";
import path from "path";

describe("process.on", () => {
  it("when called from the main thread", () => {
    const result = Fun.spawnSync({
      cmd: [funExe(), path.join(__dirname, "process-on-fixture.ts")],
      env: funEnv,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    expect(result.exitCode).toBe(0);
  });

  it("should work inside --compile", () => {
    const dir = tempDirWithFiles("process-on-test", {
      "process-on-fixture.ts": require("fs").readFileSync(require.resolve("./process-on-fixture.ts"), "utf-8"),
      "package.json": `{
        "name": "process-on-test",
        "type": "module",
        "scripts": {
          "start": "fun run process-on-fixture.ts"
        }
      }`,
    });
    const result1 = Fun.spawnSync({
      cmd: [funExe(), "build", "--compile", path.join(dir, "./process-on-fixture.ts"), "--outfile=./out"],
      env: funEnv,
      cwd: dir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    expect(result1.exitCode).toBe(0);

    const result2 = Fun.spawnSync({
      cmd: ["./out"],
      env: funEnv,
      cwd: dir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(result2.exitCode).toBe(0);
  });

  it("should work inside a macro", () => {
    const dir = tempDirWithFiles("process-on-test", {
      "process-on-fixture.ts": require("fs").readFileSync(require.resolve("./process-on-fixture.ts"), "utf-8"),
      "entry.ts": `import { initialize } from "./process-on-fixture.ts" with {type: "macro"};
      initialize();`,
      "package.json": `{
        "name": "process-on-test",
        "type": "module",
        "scripts": {
          "start": "fun run entry.ts"
        }
      }`,
    });

    expect(
      Fun.spawnSync({
        cmd: [funExe(), "build", "--target=fun", path.join(dir, "entry.ts"), "--outfile=./out.ts"],
        env: funEnv,
        cwd: dir,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      }).exitCode,
    ).toBe(0);

    const result2 = Fun.spawnSync({
      cmd: [funExe(), "run", "./out.ts"],
      env: funEnv,
      cwd: dir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    expect(result2.exitCode).toBe(0);
  });
});
