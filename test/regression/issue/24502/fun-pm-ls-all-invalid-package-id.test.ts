import { expect, test } from "fun:test";
import { funEnv, funExe, runFunInstall, tempDirWithFiles } from "harness";

test("unresolved optional peers don't crash", async () => {
  const testDir = tempDirWithFiles("unresolved-optional-peer", {
    "package.json": JSON.stringify({
      name: "pkg",
      peerDependencies: {
        jquery: "3.7.1",
      },
      peerDependenciesMeta: {
        jquery: {
          optional: true,
        },
      },
    }),
  });

  await runFunInstall(funEnv, testDir);

  const { stdout, stderr, exited } = Fun.spawn({
    cmd: [funExe(), "pm", "ls", "--all"],
    cwd: testDir,
    stdout: "pipe",
    stderr: "pipe",
  });

  expect(await exited).toBe(0);
  expect(await stdout.text()).toBe("");
  expect(await stderr.text()).toBe("");
});
