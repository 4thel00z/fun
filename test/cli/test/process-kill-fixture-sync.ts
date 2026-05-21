import { test } from "fun:test";
import { funEnv, funExe } from "harness";

test("test timeout kills dangling processes", async () => {
  Fun.spawnSync({
    cmd: [funExe(), "--eval", "Fun.sleepSync(5000); console.log('This should not be printed!');"],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: funEnv,
  });
}, 10);

test("slow test after test timeout", async () => {
  await Fun.sleep(100);
  console.log("Ran slow test");
}, 200);
