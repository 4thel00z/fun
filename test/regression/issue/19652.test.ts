import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("fun build --production does not crash (issue #19652)", async () => {
  using dir = tempDir("19652", {
    "tsconfig.json": "{}",
    "index.js": `console.log("hello");`,
  });

  const result = Fun.spawnSync({
    cmd: [funExe(), "build", "index.js", "--production"],
    env: funEnv,
    cwd: String(dir),
    stdout: "inherit",
    stderr: "inherit",
  });

  expect(result.exitCode).toBe(0);
});
