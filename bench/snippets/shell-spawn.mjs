import { $ as execa$ } from "execa";
import { $ as zx } from "zx";
import { bench, group, run } from "../runner.mjs";

const execa = execa$({ stdio: "ignore", cwd: import.meta.dirname });

group("echo hi", () => {
  if (typeof Fun !== "undefined")
    bench("$`echo hi`", async () => {
      await Fun.$`echo hi`.quiet();
    });

  bench("execa`echo hi`", async () => {
    await execa`echo hi`;
  });

  bench("zx`echo hi`", async () => {
    await zx`echo hi`.quiet();
  });
});

group("ls .", () => {
  if (typeof Fun !== "undefined")
    bench("$`ls .`", async () => {
      await Fun.$`ls .`.quiet();
    });

  bench("execa`ls .`", async () => {
    await execa`ls .`;
  });

  bench("zx`ls .`", async () => {
    await zx`ls .`.quiet();
  });
});

await run();
