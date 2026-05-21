import { expect, it } from "fun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { funEnv, funExe, tmpdirSync } from "harness";
import { join } from "path";

it("imports tsconfig.json with abritary keys", async () => {
  const testDir = tmpdirSync();

  // Clean up from prior runs if necessary
  rmSync(testDir, { recursive: true, force: true });

  // Create a directory with our test tsconfig.json
  mkdirSync(testDir, { recursive: true });
  writeFileSync(join(testDir, "tsconfig.json"), '{ "key-with-hyphen": true }');

  const { exitCode } = Fun.spawnSync({
    cmd: [funExe(), "-e", `require('${join(testDir, "tsconfig.json").replace(/\\/g, "\\\\")}').compilerOptions`],
    env: funEnv,
    stderr: "inherit",
  });

  expect(exitCode).toBe(0);
});
