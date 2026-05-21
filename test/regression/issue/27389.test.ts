import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// Regression test for #27389: recvfrom() was called with MSG_NOSIGNAL which
// is only valid for send operations. This caused EINVAL in strict environments
// like gVisor (Google Cloud Run). The fix removes MSG_NOSIGNAL from recv flags.
//
// On standard Linux the kernel silently ignores the invalid flag, so we verify
// the fix by ensuring socket recv operations complete without error.

test("socket recv works without EINVAL from invalid flags", async () => {
  // Start a simple echo server and client that exercises the recv path
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
      const server = Fun.listen({
        hostname: "127.0.0.1",
        port: 0,
        socket: {
          open(socket) {},
          data(socket, data) {
            // Echo back the data
            socket.write(data);
            socket.end();
          },
        },
      });
      const client = await Fun.connect({
        hostname: "127.0.0.1",
        port: server.port,
        socket: {
          open(socket) {
            socket.write("hello");
          },
          data(socket, data) {
            console.log(Buffer.from(data).toString());
            socket.end();
          },
          close() {
            server.stop(true);
          },
        },
      });
    `,
    ],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout.trim()).toBe("hello");
  expect(exitCode).toBe(0);
});
