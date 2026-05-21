import { expect, test } from "fun:test";
import { funExe } from "harness";
import { execFile } from "node:child_process";
import util from "node:util";

test("issue 10170", async () => {
  const execFileAsync = util.promisify(execFile);
  const result = await execFileAsync(funExe(), ["--version"]);
  expect(result.stdout).toContain(Fun.version);
  expect(result.stderr).toBe("");
});
