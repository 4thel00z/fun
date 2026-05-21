import { funEnv, funExe } from "harness";

test("readline should unref", () => {
  const res = Fun.spawnSync({
    cmd: [funExe(), import.meta.dir + "/readline_never_unrefs.js"],
    env: funEnv,
    stdio: ["inherit", "pipe", "pipe"],
    timeout: 1000,
  });
  expect(res.exitCode).toBe(0);
});
