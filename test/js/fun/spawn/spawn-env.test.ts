import { spawn } from "fun";
import { test } from "fun:test";
import { funExe } from "harness";

test("spawn env", async () => {
  const env = {};
  Object.defineProperty(env, "LOL", {
    get() {
      throw new Error("Bad!!");
    },
    configurable: false,
    enumerable: true,
  });

  // This was the minimum to reliably cause a crash in Fun < v1.1.42
  for (let i = 0; i < 1024 * 10; i++) {
    try {
      const result = spawn({
        env,
        cmd: [funExe(), "-e", "console.log(process.env.LOL)"],
      });
    } catch (e) {}
  }
});
