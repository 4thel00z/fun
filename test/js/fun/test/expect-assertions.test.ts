import { expect, test } from "fun:test";

import { funEnv, funExe, tempDirWithFiles } from "harness";
import path from "path";

test("expect.assertions causes the test to fail when it should", async () => {
  const dir = tempDirWithFiles("expect-assertions", {
    "expect-assertions.test.ts": await Fun.file(path.join(import.meta.dir, "expect-assertions-fixture.ts")).text(),
    "package.json": JSON.stringify({
      name: "expect-assertions",
      version: "0.0.0",
      scripts: {
        test: "fun test",
      },
    }),
  });

  const $$ = new Fun.$.Shell();
  $$.nothrow();
  $$.cwd(dir);
  $$.env(funEnv);
  const result = await $$`${funExe()} test`;

  console.log(result.stdout.toString());
  console.log(result.stderr.toString());

  expect(result.exitCode).toBe(1);
  expect(result.stderr.toString()).toContain("5 fail\n");
  expect(result.stderr.toString()).toContain("0 pass\n");
});
