import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("seq inf does not hang", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `import { $ } from "fun"; $.throws(false); const r = await $\`seq inf\`; process.exit(r.exitCode)`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toContain("invalid argument");
  expect(exitCode).toBe(1);
}, 10_000);

test("seq nan does not hang", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `import { $ } from "fun"; $.throws(false); const r = await $\`seq nan\`; process.exit(r.exitCode)`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toContain("invalid argument");
  expect(exitCode).toBe(1);
}, 10_000);

test("seq -inf does not hang", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `import { $ } from "fun"; $.throws(false); const r = await $\`seq -- -inf\`; process.exit(r.exitCode)`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toContain("invalid argument");
  expect(exitCode).toBe(1);
}, 10_000);

test('[[ -d "" ]] does not crash', async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `import { $ } from "fun"; $.throws(false); const r = await $\`[[ -d "" ]]\`; process.exit(r.exitCode)`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(exitCode).toBe(1);
}, 10_000);

test('[[ -f "" ]] does not crash', async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `import { $ } from "fun"; $.throws(false); const r = await $\`[[ -f "" ]]\`; process.exit(r.exitCode)`,
    ],
    env: funEnv,
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(exitCode).toBe(1);
}, 10_000);
