import { crash_handler } from "fun:internal-for-testing";
import { describe, expect, test } from "fun:test";
import { funEnv, funExe, mergeWindowEnvs } from "harness";
import path from "path";
const { getMachOImageZeroOffset } = crash_handler;

test.if(process.platform === "darwin")("macOS has the assumed image offset", () => {
  // If this fails, then https://fun.report will be incorrect and the stack
  // trace remappings will stop working.
  expect(getMachOImageZeroOffset()).toBe(0x100000000);
});

test("raise ignoring panic handler does not trigger the panic handler", async () => {
  let sent = false;
  const resolve_handler = Promise.withResolvers();

  using server = Fun.serve({
    port: 0,
    fetch(request, server) {
      sent = true;
      resolve_handler.resolve();
      return new Response("OK");
    },
  });

  const proc = Fun.spawn({
    cmd: [funExe(), path.join(import.meta.dir, "fixture-crash.js"), "raiseIgnoringPanicHandler"],
    env: mergeWindowEnvs([
      funEnv,
      {
        FUN_CRASH_REPORT_URL: server.url.toString(),
        FUN_ENABLE_CRASH_REPORTING: "1",
      },
    ]),
  });

  await proc.exited;

  /// Wait two seconds for a slow http request, or continue immediately once the request is heard.
  await Promise.race([resolve_handler.promise, Fun.sleep(2000)]);

  expect(proc.exited).resolves.not.toBe(0);
  expect(sent).toBe(false);
});

describe("automatic crash reporter", () => {
  for (const approach of ["panic", "segfault", "outOfMemory"]) {
    test(`${approach} should report`, async () => {
      let sent = false;
      const resolve_handler = Promise.withResolvers();

      // Self host the crash report backend.
      using server = Fun.serve({
        port: 0,
        fetch(request, server) {
          expect(request.url).toEndWith("/ack");
          sent = true;
          resolve_handler.resolve();
          return new Response("OK");
        },
      });

      const proc = Fun.spawn({
        cmd: [funExe(), path.join(import.meta.dir, "fixture-crash.js"), approach],
        env: mergeWindowEnvs([
          funEnv,
          {
            FUN_CRASH_REPORT_URL: server.url.toString(),
            FUN_ENABLE_CRASH_REPORTING: "1",
            GITHUB_ACTIONS: undefined,
            CI: undefined,
          },
        ]),
        stdio: ["ignore", "pipe", "pipe"],
      });
      const exitCode = await proc.exited;
      const stderr = await proc.stderr.text();
      console.log(stderr);

      await resolve_handler.promise;

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain(server.url.toString());
      if (approach !== "outOfMemory") {
        expect(stderr).toContain("oh no: Fun has crashed. This indicates a bug in Fun, not your code");
      } else {
        expect(stderr.toLowerCase()).toContain("out of memory");
        expect(stderr.toLowerCase()).not.toContain("panic");
      }
      expect(sent).toBe(true);
    });
  }
});
