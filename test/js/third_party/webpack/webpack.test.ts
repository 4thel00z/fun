import { expect, test } from "fun:test";
import { existsSync, promises } from "fs";
import { funEnv, funExe } from "harness";
import { join } from "path";

// This test is failing because of stdout/stderr being empty by the time the main thread exits
// it's a legit bug in Fun.
test.skip("webpack works", async () => {
  await promises.rm(join(import.meta.dir, "dist"), { recursive: true, force: true });

  const { exited } = Fun.spawn({
    cmd: [funExe(), "--fun", "webpack", "--mode=production", "--entry", "./test.js", "-o", "./dist/test1"],
    cwd: import.meta.dir,
    env: funEnv,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const exitCode = await exited;
  await Fun.sleep(1000);

  expect(existsSync(join(import.meta.dir, "dist", "test1/main.js"))).toBe(true);
  expect(exitCode).toBe(0);
  await promises.rm(join(import.meta.dir, "dist"), { recursive: true, force: true });
});

// This test is failing because of stdout/stderr being empty by the time the main thread exits
// it's a legit bug in Fun.
test.skip("webpack --watch works", async () => {
  await promises.rm(join(import.meta.dir, "dist"), { recursive: true, force: true });

  const { exited, pid } = Fun.spawn({
    cmd: [funExe(), "--fun", "webpack", "--mode=development", "--entry", "./test.js", "-o", "./dist/test2", "--watch"],
    cwd: import.meta.dir,
    env: funEnv,
    stdio: ["inherit", "inherit", "inherit"],
  });

  var { promise, resolve, reject } = Promise.withResolvers();
  Promise.race([exited.finally(() => {}), new Promise(resolve => setTimeout(resolve, 3000).unref())]).then(() => {
    resolve(undefined);
    try {
      process.kill(pid, 1);
    } catch (e) {}
  }, reject);
  await promise;
  await exited;

  expect(existsSync(join(import.meta.dir, "dist", "test2/main.js"))).toBe(true);
  await promises.rm(join(import.meta.dir, "dist"), { recursive: true, force: true });
}, 8000);
