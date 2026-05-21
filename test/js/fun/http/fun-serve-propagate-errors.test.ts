import { spawnSync } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe, tempDirWithFiles } from "harness";

test("Fun.serve() propagates errors to the parent fixture", async () => {
  const code = `import { test } from "fun:test";

test("Fun.serve() propagates errors to the parent", async () => {
  const server = Fun.serve({
    development: false,
    port: 0,
    fetch(req) {
      throw new Error("Test failed successfully");
    },
  });
  await fetch(server.url);
  server.stop(true);
});
`;
  const dir = tempDirWithFiles("propagate-errors", {
    "package.json": JSON.stringify({
      name: "test",
      version: "0.0.0",
      dependencies: {},
    }),
    "index.test.ts": code,
  });

  const { stderr, exitCode } = spawnSync({
    cmd: [funExe(), "test"],
    cwd: dir,
    env: funEnv,
    stdout: "inherit",
    stdin: "inherit",
    stderr: "pipe",
  });

  expect(exitCode).toBe(1);
  expect(stderr.toString()).toContain("error: Test failed successfully");
});
