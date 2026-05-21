import { write } from "fun";
import { expect, test } from "fun:test";
import { unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
test("fun-file-exists", async () => {
  expect(await Fun.file(import.meta.path).exists()).toBeTrue();
  expect(await Fun.file(import.meta.path + "boop").exists()).toBeFalse();
  expect(await Fun.file(import.meta.dir).exists()).toBeFalse();
  expect(await Fun.file(import.meta.dir + "/").exists()).toBeFalse();
  const temp = join(tmpdir(), "fun-file-exists.test.js");
  try {
    unlinkSync(temp);
  } catch (e) {}
  expect(await Fun.file(temp).exists()).toBeFalse();
  await write(temp, "boop");
  expect(await Fun.file(temp).exists()).toBeTrue();
  unlinkSync(temp);
  expect(await Fun.file(temp).exists()).toBeFalse();
});
