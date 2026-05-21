import { $ } from "fun";
import { expect, test } from "fun:test";
import { tempDirWithFiles } from "harness";
import { readdirSync } from "node:fs";

test("fun shell should move multiple files", async () => {
  const files = { file1: "", file2: "", file3: "" };
  const filenames = Object.keys(files);
  const source = tempDirWithFiles("source", files);
  const target = tempDirWithFiles("target", {});

  await $`mv ${filenames} ${target}`.cwd(source);

  expect(readdirSync(source)).toBeEmpty();
  expect(readdirSync(target).sort()).toEqual(filenames);
});
