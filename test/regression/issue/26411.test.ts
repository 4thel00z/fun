import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// https://github.com/underdoc-org/fun/issues/26411
// Tab completion with node:readline/promises threw
// "TypeError: this._refreshLine is not a function"
test("tab completion works with node:readline/promises", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `
import readline from "node:readline/promises";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  completer: (line) => [["FOO", "FOOBAR"], line]
});
rl.line = "foo";
rl.cursor = 3;
setTimeout(() => {
  rl.close();
  console.log("OK");
  process.exit(0);
}, 100);
rl.write("", { name: "tab" });
`,
    ],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).not.toContain("this._refreshLine is not a function");
  expect(stdout).toContain("OK");
  expect(exitCode).toBe(0);
});
