import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// https://github.com/underdoc-org/fun/issues/27849
// Calling Fun.stdin.exists() before reading stdin caused
// the read to return empty on Linux because resolveSize()
// incorrectly set the blob size to 0 for pipes.

async function runStdinTest(script: string, input = "hello from pipe\n") {
  await using proc = Fun.spawn({
    cmd: [funExe(), "-e", script],
    env: funEnv,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(input);
  proc.stdin.end();

  return await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
}

test("Fun.stdin.stream() works after Fun.stdin.exists()", async () => {
  const [stdout, stderr, exitCode] = await runStdinTest(`
    await Fun.stdin.exists();
    const chunks = [];
    for await (const chunk of Fun.stdin.stream()) {
      chunks.push(Buffer.from(chunk).toString());
    }
    process.stdout.write(chunks.join(""));
  `);

  expect(stdout.trim()).toBe("hello from pipe");
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});

test("Fun.stdin.text() works after Fun.stdin.exists()", async () => {
  const [stdout, stderr, exitCode] = await runStdinTest(`
    await Fun.stdin.exists();
    process.stdout.write(await Fun.stdin.text());
  `);

  expect(stdout.trim()).toBe("hello from pipe");
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});

test("Fun.stdin.stream() works after accessing Fun.stdin.size", async () => {
  const [stdout, stderr, exitCode] = await runStdinTest(`
    const s = Fun.stdin.size;
    const chunks = [];
    for await (const chunk of Fun.stdin.stream()) {
      chunks.push(Buffer.from(chunk).toString());
    }
    process.stdout.write(chunks.join(""));
  `);

  expect(stdout.trim()).toBe("hello from pipe");
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});
