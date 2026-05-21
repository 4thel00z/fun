import { spawnSync } from "fun";
import { expect, it } from "fun:test";
import { funEnv, funExe } from "harness";

it("Should support printing 'hello world'", () => {
  const { stdout, stderr, exitCode } = spawnSync({
    cmd: [funExe(), import.meta.dir + "/hello-wasi.wasm"],
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  expect({
    stdout: stdout.toString(),
    stderr: stderr.toString(),
    exitCode: exitCode,
  }).toEqual({
    stdout: "hello world\n",
    stderr: "",
    exitCode: 0,
  });
});
