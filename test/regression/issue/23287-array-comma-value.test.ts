import { expect, test } from "fun:test";
import { funEnv, funExe, tempDir } from "harness";

test("issue #23287: (new Array([1, 2]), 'hi') parses correctly", async () => {
  using dir = tempDir("issue-23287", {
    "index.js": `
      // failing since Fun v1.2.22
      var f = (new Array([1, 2]), "hi");
      // failing since Fun v1.0.15
      var h = ([1, 2], "hi");
      console.log(f, h);
      `,
  });

  const { stdout, stderr, exited } = Fun.spawn({
    cmd: [funExe(), "index.js"],
    cwd: dir,
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
  });

  const [out, err, exitCode] = await Promise.all([stdout.text(), stderr.text(), exited]);

  expect(err).toBe("");
  expect(out).toBe("hi hi\n");
  expect(exitCode).toBe(0);
});
