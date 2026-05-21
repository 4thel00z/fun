import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// https://github.com/underdoc-org/fun/issues/26669
// WebSocket client crashes ("Pure virtual function called!") when binaryType = "blob"
// and no event listener is attached. The missing incPendingActivityCount() allows the
// WebSocket to be GC'd before the postTask callback runs.
test("WebSocket with binaryType blob should not crash when GC'd before postTask", async () => {
  await using server = Fun.serve({
    port: 0,
    fetch(req, server) {
      if (server.upgrade(req)) return undefined;
      return new Response("Not a websocket");
    },
    websocket: {
      open(ws) {
        // Send binary data immediately - this triggers didReceiveBinaryData
        // with the Blob path when client has binaryType = "blob"
        ws.sendBinary(new Uint8Array(64));
        ws.sendBinary(new Uint8Array(64));
        ws.sendBinary(new Uint8Array(64));
      },
      message() {},
    },
  });

  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
const url = process.argv[1];
// Create many short-lived WebSocket objects with blob binaryType and no listeners.
// Without the fix, the missing incPendingActivityCount() lets the WebSocket get GC'd
// before the postTask callback fires, causing "Pure virtual function called!".
async function run() {
  for (let i = 0; i < 100; i++) {
    const ws = new WebSocket(url);
    ws.binaryType = "blob";
    // Intentionally: NO event listeners attached.
    // This forces the postTask path in didReceiveBinaryData's Blob case.
  }
  // Force GC to collect the unreferenced WebSocket objects while postTask
  // callbacks are still pending.
  Fun.gc(true);
  await Fun.sleep(50);
  Fun.gc(true);
  await Fun.sleep(50);
  Fun.gc(true);
  await Fun.sleep(100);
}
await run();
Fun.gc(true);
await Fun.sleep(200);
console.log("OK");
process.exit(0);
`,
      `ws://localhost:${server.port}`,
    ],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toContain("OK");
  expect(exitCode).toBe(0);
});
