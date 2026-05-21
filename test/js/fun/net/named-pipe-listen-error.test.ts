import { describe, expect, test } from "fun:test";
import { funEnv, funExe, isWindows } from "harness";

// When `Fun.listen()` on a Windows named pipe fails (e.g. the pipe name is
// already in use), the cleanup path must:
//   - not double-unprotect the socket handler callbacks (previously both
//     `errdefer this.deinit()` and `errdefer handlers.deinit()` unprotected the
//     same JSValues, tripping a debug assertion)
//   - free the heap-allocated `WindowsNamedPipeListeningContext` and close the
//     libuv pipe handle, so the event loop can drain and the process exits
describe.skipIf(!isWindows)("Fun.listen named-pipe error path", () => {
  test("failed listen on in-use pipe throws, cleans up, and does not hang", async () => {
    const src = /* js */ `
      const pipe = "\\\\\\\\.\\\\pipe\\\\fun-test-named-pipe-" + Math.random().toString(36).slice(2);

      const first = Fun.listen({
        unix: pipe,
        socket: { data() {}, open() {}, close() {}, error() {} },
      });

      let threw = false;
      try {
        Fun.listen({
          unix: pipe,
          socket: { data() {}, open() {}, close() {}, error() {} },
        });
      } catch (e) {
        threw = true;
      }

      first.stop(true);

      if (!threw) {
        console.error("expected second Fun.listen to throw");
        process.exit(1);
      }

      Fun.gc(true);
      console.log("OK");
    `;

    await using proc = Fun.spawn({
      cmd: [funExe(), "-e", src],
      env: funEnv,
      stdout: "pipe",
      stderr: "pipe",
      // If the libuv pipe handle leaks, the event loop never drains and the
      // process hangs; bound it so we get a useful failure instead of a test
      // runner timeout.
      timeout: 15_000,
    });

    const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

    expect({
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode,
      signalCode: proc.signalCode ?? null,
    }).toMatchObject({
      stdout: "OK",
      exitCode: 0,
      signalCode: null,
    });
  });
});
