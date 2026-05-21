import { $ } from "fun";
import { expect, test } from "fun:test";
import { tempDirWithFiles } from "harness";
import { rmSync } from "node:fs";
import { join } from "path";

test("$ is lazy", async () => {
  const base = tempDirWithFiles("fun-lazy-test", {
    "fun-lazy": "789",
  });
  const path = join(base, "fun-lazy");
  rmSync(path, { force: true, recursive: true });
  const pending = $`echo 123 > ${path}`;
  expect(async () => await Fun.file(path).text()).toThrow();
  await Fun.write(path, "456");
  expect(await Fun.file(path).text()).toBe("456");
  await pending;
  expect(await Fun.file(path).text()).toBe("123\n");
});
