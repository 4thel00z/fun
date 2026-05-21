import { file } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";
import { join } from "path";

test("custom matcher runs", async () => {
  const dir = tempDirWithFiles("custom-matcher-preload-test-fixture", {
    "preload.ts": await file(join(import.meta.dir, "custom-matcher-preload-test-fixture-1.ts")).text(),
    "expect-extend.test.ts": await file(join(import.meta.dir, "custom-matcher-preload-test-fixture-2.ts")).text(),
    "funfig.toml": `
[test]
preload = "./preload.ts"
        `,
    "package.json": JSON.stringify(
      {
        name: "custom-matcher-preload-test-fixture",
        version: "1.0.0",
      },
      null,
      2,
    ),
  });
  const { stdout, exitCode } = Fun.spawnSync({
    cmd: [funExe(), "test", "expect-extend.test.ts"],
    cwd: dir,
    env: funEnv,
    stderr: "inherit",
    stdout: "pipe",
    stdin: "inherit",
  });
  expect(stdout.toString().trim()).toContain("custom matcher test passed");
  expect(exitCode).toBe(0);
});
