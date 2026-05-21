import { test } from "fun:test";

test("issue #27099", async () => {
  // Run it twice to trigger ASAN.
  await run();
  await run();
});

async function run() {
  const fileOps = Array.from({ length: 10 }, () => Fun.file("/tmp/nope").exists());

  const outer = Fun.spawn(["bash", "-c", 'for j in $(seq 1 100); do echo "padding padding padding"; done'], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const outerText = new Response(outer.stdout as ReadableStream).text();

  const inner = Fun.spawn(["cat"], {
    stdin: new Response(Buffer.allocUnsafe(20000).fill("a").toString()),
    stdout: "pipe",
  });
  await new Response(inner.stdout as ReadableStream).text();

  await inner.exited;
  await outerText;
  await outer.exited;
  await Promise.all(fileOps);
}
