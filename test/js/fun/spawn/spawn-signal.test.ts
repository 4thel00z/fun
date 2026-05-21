import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("spawn AbortSignal works after spawning", async () => {
  const controller = new AbortController();
  const { signal } = controller;
  const start = performance.now();
  const subprocess = Fun.spawn({
    cmd: [funExe(), "--eval", "await Fun.sleep(100000)"],
    env: funEnv,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    signal,
  });
  await Fun.sleep(1);
  controller.abort();
  expect(await subprocess.exited).not.toBe(0);
  const end = performance.now();
  expect(end - start).toBeLessThan(100);
});

test("spawn AbortSignal works if already aborted", async () => {
  const controller = new AbortController();
  const { signal } = controller;
  const start = performance.now();
  const subprocess = Fun.spawn({
    cmd: [funExe(), "--eval", "await Fun.sleep(100000)"],
    env: funEnv,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    signal,
  });
  await Fun.sleep(1);
  controller.abort();
  expect(await subprocess.exited).not.toBe(0);
  const end = performance.now();
  expect(end - start).toBeLessThan(100);
});

test("spawn AbortSignal args validation", async () => {
  expect(() =>
    Fun.spawn({
      cmd: [funExe(), "--eval", "await Fun.sleep(100000)"],
      env: funEnv,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
      signal: 123,
    }),
  ).toThrow();
});

test("spawnSync AbortSignal works as timeout", async () => {
  const start = performance.now();
  const subprocess = Fun.spawnSync({
    cmd: [funExe(), "--eval", "await Fun.sleep(100000)"],
    env: funEnv,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    signal: AbortSignal.timeout(10),
  });

  expect(subprocess.success).toBeFalse();
  const end = performance.now();
  expect(end - start).toBeLessThan(100);
});
