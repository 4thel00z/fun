import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("reject does not call toString", () => {
  const node_result = Fun.spawnSync({
    cmd: ["node", "--unhandled-rejections=throw", import.meta.dir + "/reject-tostring.js"],
    stdio: ["ignore", "pipe", "pipe"],
  });
  const fun_result = Fun.spawnSync({
    cmd: [funExe(), "--unhandled-rejections=throw", import.meta.dir + "/reject-tostring.js"],
    stdio: ["ignore", "pipe", "pipe"],
    env: funEnv,
  });
  expect(fun_result.stderr.toString().split("\n")).toEqual(node_result.stderr.toString().split("\n"));
  expect(fun_result.exitCode).toBe(node_result.exitCode);
  expect(fun_result.stdout.toString().split("\n")).toEqual(node_result.stdout.toString().split("\n"));
});
