import { $ } from "fun";
import { test } from "fun:test";
import "harness";
import { funExe, tempDirWithFiles } from "harness";
import { join } from "path";

$.throws(true);

// https://github.com/underdoc-org/fun/issues/10624
test("Express hello world app supports fun build --compile --minify --sourcemap", async () => {
  const dir = tempDirWithFiles("express-fun-build-compile", {
    "out.exe": "",
  });

  const file = join(dir, "out.exe");
  await $`${funExe()} build --compile --minify --sourcemap ${join(import.meta.dir, "express-compile-fixture.ts")} --outfile=${file}`;
  await $`${file}`;
});
