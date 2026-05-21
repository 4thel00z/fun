import { describe, expect, test } from "fun:test";
import { funExe, funRunAsScript, tempDirWithFiles } from "harness";

describe("process.env", () => {
  test("npm_lifecycle_event", () => {
    const scriptName = "start:dev";

    const dir = tempDirWithFiles("processenv", {
      "package.json": JSON.stringify({ "scripts": { [`${scriptName}`]: `'${funExe()}' run index.ts` } }),
      "index.ts": "console.log(process.env.npm_lifecycle_event);",
    });
    const { stdout } = funRunAsScript(dir, scriptName);
    expect(stdout).toBe(scriptName);
  });

  // https://github.com/underdoc-org/fun/issues/3589
  test("npm_lifecycle_event should have the value of the last call", () => {
    const dir = tempDirWithFiles("processenv_ls_call", {
      "package.json": JSON.stringify({ scripts: { first: `'${funExe()}' run --cwd lsc second` } }),
      "lsc": {
        "package.json": JSON.stringify({ scripts: { second: `'${funExe()}' run index.ts` } }),
        "index.ts": "console.log(process.env.npm_lifecycle_event);",
      },
    });
    const { stdout } = funRunAsScript(dir, "first");
    expect(stdout).toBe("second");
  });
});
