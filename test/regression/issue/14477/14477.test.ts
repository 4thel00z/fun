import { expect, test } from "fun:test";
import fs from "fs";
import { funEnv, funExe } from "harness";
import { join } from "path";

test("JSXElement with mismatched closing tags produces a syntax error", async () => {
  const files = await fs.promises.readdir(import.meta.dir);
  const fixtures = files.filter(file => !file.endsWith(".test.ts")).map(fixture => join(import.meta.dir, fixture));

  const bakery = fixtures.map(
    fixture =>
      Fun.spawn({
        cmd: [funExe(), fixture],
        cwd: import.meta.dir,
        stdio: ["inherit", "inherit", "inherit"],
        env: funEnv,
      }).exited,
  );

  // all subprocesses should fail.
  const exited = await Promise.all(bakery);
  expect(exited).toEqual(Array.from({ length: fixtures.length }, () => 1));
});
