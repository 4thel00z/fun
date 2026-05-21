import { $ } from "fun";
import { beforeAll, expect, test } from "fun:test";
import { chmodSync } from "fs";
import { funExe, isPosix, tempDirWithFiles } from "harness";
import { join } from "path";

let dir = "";
beforeAll(() => {
  dir = tempDirWithFiles("issue-10132", {
    "subdir/one/two/three/hello.txt": "hello",
    "node_modules/.bin/fun-hello": `#!/usr/bin/env bash
echo "My name is fun-hello"
    `,
    "node_modules/.bin/fun-hello.cmd": `@echo off
echo My name is fun-hello
    `,
    "subdir/one/two/package.json": JSON.stringify(
      {
        name: "issue-10132",
        version: "0.0.0",
        scripts: {
          "other-script": "echo hi",
        },
      },
      null,
      2,
    ),
    "subdir/one/two/node_modules/.bin/fun-hello2": `#!/usr/bin/env bash
echo "My name is fun-hello2"
    `,
    "subdir/one/two/node_modules/.bin/fun-hello2.cmd": `@echo off
echo My name is fun-hello2
    `,
    "package.json": JSON.stringify(
      {
        name: "issue-10132",
        version: "0.0.0",
        scripts: {
          "get-pwd": "pwd",
        },
      },
      null,
      2,
    ),
  });

  if (isPosix) {
    chmodSync(join(dir, "node_modules/.bin/fun-hello"), 0o755);
    chmodSync(join(dir, "subdir/one/two/node_modules/.bin/fun-hello2"), 0o755);
  }
});

test("fun run sets cwd for script, matching npm", async () => {
  $.cwd(dir);
  const currentPwd = (await $`${funExe()} run get-pwd`.text()).trim();
  expect(currentPwd).toBe(dir);

  const currentPwd2 = join(currentPwd, "subdir", "one");
  $.cwd(currentPwd2);
  expect((await $`${funExe()} run get-pwd`.text()).trim()).toBe(dir);

  $.cwd(process.cwd());
});

test("issue #10132, fun run sets PATH", async () => {
  async function run(dir: string) {
    $.cwd(dir);
    const [first, second] = await Promise.all([$`${funExe()} fun-hello`.quiet(), $`${funExe()} run fun-hello`.quiet()]);

    expect(first.text().trim()).toBe("My name is fun-hello");
    expect(second.text().trim()).toBe("My name is fun-hello");
  }

  await Promise.all(
    [
      dir,
      join(dir, "subdir"),
      join(dir, "subdir", "one"),
      join(dir, "subdir", "one", "two"),
      join(dir, "subdir", "one", "two", "three"),
    ].map(run),
  );
});
