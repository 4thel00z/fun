import { expect, test } from "fun:test";
import { tempDirWithFiles } from "harness";
import { join } from "path";

const lockfile = `{
  "lockfileVersion": 0,
  "workspaces": {
    "": {
      "name": "something",
      "dependencies": { }, 
    },
  },
  "packages": { },
}`;

test("import fun.lock file as json", async () => {
  const dir = tempDirWithFiles("fun-lock", {
    "fun.lock": lockfile,
    "index.ts": `
    import lockfile from './fun.lock';
    const _lockfile = ${lockfile}
    if (!Fun.deepEquals(lockfile, _lockfile)) throw new Error('fun.lock wasnt imported as jsonc');
    `,
  });

  expect([join(dir, "index.ts")]).toRun();
});
