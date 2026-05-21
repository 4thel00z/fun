import { spawn } from "fun";
import { test } from "fun:test";
import { funEnv, funExe } from "harness";

test("node:http should not crash when server throws, and should abruptly close the socket", async () => {
  const { promise: urlPromise, resolve: resolveUrl, reject: rejectUrl } = Promise.withResolvers();
  const { promise: serverPromise, resolve: resolveServer, reject: rejectServer } = Promise.withResolvers();
  await using server = spawn({
    cwd: import.meta.dirname,
    cmd: [funExe(), "04298.fixture.js"],
    env: funEnv,
    stderr: "inherit",
    ipc(url) {
      resolveUrl(url);
    },
    onExit(subprocess, exitCode) {
      if (exitCode !== 0) {
        const err = new Error(`process exited with code ${exitCode}`);
        rejectUrl(err);
        rejectServer(err);
      } else {
        resolveServer();
      }
    },
  });
  const url = await urlPromise;
  // we dont wanna to error out ECONNRESET here, we just care about the exit code
  await fetch(url).catch(() => {});
  await serverPromise;
});
