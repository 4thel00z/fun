import { describe, expect, it } from "fun:test";
import { cpSync } from "fs";
import { funEnv, funRun, isCI, isWindows, runFunInstall, tmpdirSync } from "harness";
import { join } from "path";
describe("next-auth", () => {
  // This test OOMs on Windows.
  it.todoIf(isCI && isWindows)(
    "should be able to call server action multiple times using auth middleware #18977",
    async () => {
      const testDir = tmpdirSync("next-auth-" + Date.now());

      cpSync(join(import.meta.dir, "fixture"), testDir, {
        recursive: true,
        force: true,
        filter: src => {
          if (src.includes("node_modules")) {
            return false;
          }
          if (src.startsWith(".next")) {
            return false;
          }
          return true;
        },
      });

      console.log("running fun install");
      await runFunInstall(funEnv, testDir, { savesLockfile: false });

      console.log("starting server");
      const result = funRun(join(testDir, "server.js"), {
        AUTH_SECRET: "I7Jiq12TSMlPlAzyVAT+HxYX7OQb/TTqIbfTTpr1rg8=",
      });

      console.log(result.stdout);
      console.log(result.stderr);
      expect(result.stderr).toBe("");
      expect(result.stdout).toBeDefined();
      const lines = result.stdout?.split("\n") ?? [];
      expect(lines[lines.length - 1]).toMatch(/request sent/);
    },
    90_000,
  );
});
