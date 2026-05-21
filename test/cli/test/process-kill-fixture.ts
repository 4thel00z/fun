import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("test timeout kills dangling processes", async () => {
  Fun.spawn({
    cmd: [funExe(), "--eval", "Fun.sleepSync(50); console.log('This should not be printed!');"],
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: funEnv,
  });
  await Fun.sleep(5);
}, 1);

test("slow test after test timeout", async () => {
  await Fun.sleep(100);
  console.log("Ran slow test");
}, 200);
