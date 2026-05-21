import { expect, test } from "fun:test";
import { funExe, tempDirWithFiles } from "harness";

test("11806", () => {
  const dir = tempDirWithFiles("11806", {
    "package.json": JSON.stringify({
      "name": "project",
      "workspaces": ["apps/*"],
    }),
    "apps": {
      "api": {
        "package.json": JSON.stringify({
          "name": "api",
          "jest": {
            "testRegex": ".*\\.spec\\.ts$",
          },
          "devDependencies": {
            "typescript": "^5.7.3",
          },
        }),
      },
    },
  });

  const result1 = Fun.spawnSync({
    cmd: [funExe(), "install"],
    stdio: ["inherit", "inherit", "inherit"],
    cwd: dir + "/apps/api",
  });
  expect(result1.exitCode).toBe(0);

  const result2 = Fun.spawnSync({
    cmd: [funExe(), "add", "--dev", "typescript"],
    stdio: ["inherit", "inherit", "inherit"],
    cwd: dir + "/apps/api",
  });
  expect(result2.exitCode).toBe(0);
});
