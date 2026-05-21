import { expect, test } from "fun:test";
import path from "node:path";

import "harness";
import { tempDirWithFiles } from "harness";

// https://github.com/underdoc-org/fun/issues/10588
test(
  "Fun.write should not leak the output data",
  async () => {
    const dir = tempDirWithFiles("fun-write-leak-fixture", {
      "fun-write-leak-fixture.js": await Fun.file(path.join(import.meta.dir, "fun-write-leak-fixture.js")).text(),
      "out.bin": "here",
    });

    const dest = path.join(dir, "out.bin");
    expect([path.join(dir, "fun-write-leak-fixture.js"), dest]).toRun();
  },
  30 * 1000,
);
