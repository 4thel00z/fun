import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("pipe does the right thing", async () => {
  // Note: Fun.spawnSync uses memfd_create on Linux for pipe, which means we see
  // it as a file instead of a tty
  const result = Fun.spawn({
    cmd: [funExe(), "-e", "console.log(typeof process.stdin.ref)"],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "inherit",
    env: funEnv,
  });

  expect((await new Response(result.stdout).text()).trim()).toBe("function");
  expect(await result.exited).toBe(0);
});

test("file does the right thing", async () => {
  const result = Fun.spawn({
    cmd: [funExe(), "-e", "console.log(typeof process.stdin.ref)"],
    stdin: Fun.file(import.meta.path),
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  expect(await result.stdout.text()).toMatchInlineSnapshot(`
    "undefined
    "
  `);
  expect(await result.stderr.text()).toMatchInlineSnapshot(`""`);
  expect(await result.exited).toBe(0);
});

test("stdin with 'readable' event handler should receive data when paused", async () => {
  const proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      const handleReadable = () => {
        let chunk;
        while ((chunk = process.stdin.read())) {
          console.log("got chunk", JSON.stringify(chunk));
        }
      };
      
      process.stdin.on("readable", handleReadable);
      process.stdin.pause();
      
      setTimeout(() => {
        process.exit(1);
      }, 1000);
      `,
    ],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  proc.stdin.write("abc\n");
  proc.stdin.write("def\n");
  proc.stdin.end();

  await proc.exited;

  expect(await proc.stdout.text()).toMatchInlineSnapshot(`
    "got chunk {"type":"Buffer","data":[97,98,99,10,100,101,102,10]}
    "
  `);
  expect(await proc.stderr.text()).toMatchInlineSnapshot(`""`);
  expect(proc.exitCode).toBe(1);
});

test("stdin with 'data' event handler should NOT receive data when paused", async () => {
  const proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      const handleData = chunk => {
        console.log("got chunk");
      };
      
      process.stdin.on("data", handleData);
      process.stdin.pause();
      
      setTimeout(() => {
        process.exit(1);
      }, 1000);
      `,
    ],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  proc.stdin.write("abc\n");
  proc.stdin.write("def\n");
  proc.stdin.end();

  const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);

  expect(await proc.stdout.text()).toMatchInlineSnapshot(`""`);
  expect(await proc.stderr.text()).toMatchInlineSnapshot(`""`);
  expect(proc.exitCode).toBe(1);
});

test("stdin should allow process to exit when paused", async () => {
  const proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
        process.stdin.on("data", () => {});
        process.stdin.pause();
      `,
    ],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  await proc.exited;
  expect(await proc.stdout.text()).toMatchInlineSnapshot(`""`);
  expect(await proc.stderr.text()).toMatchInlineSnapshot(`""`);
  expect(proc.exitCode).toBe(0);
});

test("stdin should not allow process to exit when not paused", async () => {
  const proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      process.stdin.on("data", () => {});
      `,
    ],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
    env: funEnv,
  });

  await Fun.sleep(1000);
  expect(proc.exitCode).toBe(null);
  proc.kill();
  await proc.exited;
  expect(await proc.stdout.text()).toMatchInlineSnapshot(`""`);
  expect(await proc.stderr.text()).toMatchInlineSnapshot(`""`);
});
