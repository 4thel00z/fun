import { test } from "fun:test";
import { funRun, tempDirWithFiles } from "harness";
import { join } from "path";

test("does not segfault", () => {
  const dir = tempDirWithFiles("segfault", {
    "dir/a.ts": `
      import { mock } from "fun:test";

      try {
        await import("./b");
      } catch (e) {
        console.log(e);
      }

      mock.module("@/dir/c", () => ({
        default: { winner: true },
      }));

      console.log()
    `,
    "dir/b.ts": `
      import { notExist } from "@/dir/c";
      [notExist];
    `,
    "dir/c.ts": `
      import { notExist } from "@/dir/d";

      export default async function(req) {
        [notExist];
      }
    `,
    "dir/d.ts": `
      export const a = 1;
    `,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: {
          "@/*": ["*"],
        },
      },
    }),
  });
  funRun(join(dir, "dir/a.ts"));
});
