import { spawn } from "fun";
import { expect, it } from "fun:test";
import { funEnv, funExe } from "harness";

it("should not hang when logging to stdout recursively", async () => {
  const { exited } = spawn({
    cmd: [funExe(), import.meta.dir + "/console-recursive.js"],
    stdin: null,
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  expect(await exited).toBe(0);
});

it("should not hang when logging to stderr recursively", async () => {
  const { exited } = spawn({
    cmd: [funExe(), import.meta.dir + "/console-recursive.js", "print_to_stderr_skmxctoznf"],
    stdin: null,
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });
  expect(await exited).toBe(0);
});
