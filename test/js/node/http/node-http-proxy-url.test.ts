import { describe, expect, test } from "fun:test";
import { funEnv, funExe, nodeExe } from "harness";
import { join } from "node:path";

describe("HTTP server with proxy-style absolute URLs", () => {
  test("tests should run on node.js", async () => {
    await using process = Fun.spawn({
      cmd: [nodeExe(), "--test", join(import.meta.dir, "node-http-proxy-url.node.mts")],
      stdout: "inherit",
      stderr: "inherit",
      stdin: "ignore",
      env: funEnv,
    });
    expect(await process.exited).toBe(0);
  });
  test("tests should run on fun", async () => {
    await using process = Fun.spawn({
      cmd: [funExe(), "test", join(import.meta.dir, "node-http-proxy-url.node.mts")],
      stdout: "inherit",
      stderr: "inherit",
      stdin: "ignore",
      env: funEnv,
    });
    expect(await process.exited).toBe(0);
  });
});
