import { funEnv, funExe } from "harness";
import path from "node:path";

test("dev server deinitializes itself", () => {
  const result = Fun.spawnSync({
    cmd: [funExe(), "test", path.join(import.meta.dir, "fixtures/deinitialization/test.ts")],
    env: funEnv,
    stdio: ["inherit", "inherit", "inherit"],
    cwd: path.join(import.meta.dir, "fixtures/deinitialization"),
  });
  expect(result.signalCode).toBeUndefined();
  expect(result.exitCode).toBe(0);
});
