import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("process.stdin should work after pause() and resume()", async () => {
  const script = `
process.stdin.on("data", chunk => {
  process.stdout.write(chunk);
});
process.stdin.pause();
process.stdin.resume();
`;

  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", script],
    env: funEnv,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write("hello\n");
  proc.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toBe("hello\n");
});

test("process.stdin should receive data after multiple pause/resume cycles", async () => {
  const script = `
let received = '';
process.stdin.on("data", chunk => {
  received += chunk.toString();
});

process.stdin.pause();
process.stdin.resume();
process.stdin.pause();
process.stdin.resume();

process.stdin.on("end", () => {
  console.log("RECEIVED:", received);
});
`;

  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", script],
    env: funEnv,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write("test data");
  proc.stdin.end();

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
  expect(stdout).toContain("RECEIVED: test data");
});
