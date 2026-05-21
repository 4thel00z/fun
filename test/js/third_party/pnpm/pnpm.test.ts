import { expect, it } from "fun:test";
import { funEnv, funExe, tmpdirSync } from "harness";
import { cpSync } from "node:fs";
import * as path from "node:path";

it("successfully traverses pnpm-generated install directory", async () => {
  const package_dir = tmpdirSync();
  console.log(package_dir);

  cpSync(path.join(__dirname, "install_fixture"), package_dir, { recursive: true });

  let exited;

  //

  ({ exited } = Fun.spawn({
    cmd: [funExe(), "x", "pnpm@9.15.6", "install"],
    cwd: path.join(package_dir),
    stdio: ["ignore", "inherit", "inherit"],
    env: funEnv,
  }));
  expect(await exited).toBe(0);
  console.log(2);

  //

  ({ exited } = Fun.spawn({
    cmd: [funExe(), "run", "build"],
    cwd: path.join(package_dir),
    stdio: ["ignore", "inherit", "inherit"],
    env: funEnv,
  }));
  expect(await exited).toBe(0);
  console.log(3);
}, 100_000);
