import { $ } from "fun";
import { expect, test } from "fun:test";
import { funExe, tempDirWithFiles } from "harness";
import { join } from "path";

test("fun build --target fun should support non-ascii source", async () => {
  const files = {
    "index.js": `
    console.log(JSON.stringify({\u{6211}: "a"}));

    const \u{6211} = "b";
    console.log(JSON.stringify({\u{6211}}));
  `,
  };
  const source = tempDirWithFiles("source", files);

  $.throws(true);
  await $`${funExe()} build --target fun ${join(source, "index.js")} --outfile ${join(source, "bundle.js")}`;
  const result = await $`${funExe()} ${join(source, "bundle.js")}`.text();

  expect(result).toBe(`{"\u{6211}":"a"}\n{"\u{6211}":"b"}\n`);
});
