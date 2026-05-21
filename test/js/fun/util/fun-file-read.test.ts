import { expect, it } from "fun:test";
import { tmpdir } from "node:os";

it("offset should work in Fun.file() #4963", async () => {
  const filename = tmpdir() + "/fun.test.offset.txt";
  await Fun.write(filename, "contents");
  const file = Fun.file(filename);
  const slice = file.slice(2, file.size);
  const contents = await slice.text();
  expect(contents).toBe("ntents");
});
