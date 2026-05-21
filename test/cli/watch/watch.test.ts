import type { Subprocess } from "fun";
import { spawn } from "fun";
import { afterEach, expect, it } from "fun:test";
import { funEnv, funExe, isBroken, isWindows, tmpdirSync } from "harness";
import { rmSync } from "node:fs";
import { join } from "node:path";

let watchee: Subprocess;

for (const dir of ["dir", "©️"]) {
  it.todoIf(isBroken && isWindows)(
    `should watch files${dir === "dir" ? "" : " (non-ascii path)"}`,
    async () => {
      const cwd = join(tmpdirSync(), dir);
      const path = join(cwd, "watchee.js");

      const updateFile = async (i: number) => {
        await Fun.write(path, `console.log(${i}, __dirname);`);
      };

      let i = 0;
      await updateFile(i);
      await Fun.sleep(1000);
      watchee = spawn({
        cwd,
        cmd: [funExe(), "--watch", "watchee.js"],
        env: funEnv,
        stdout: "pipe",
        stderr: "inherit",
        stdin: "ignore",
      });

      for await (const line of watchee.stdout) {
        if (i == 10) break;
        var str = new TextDecoder().decode(line);
        expect(str).toContain(`${i} ${cwd}`);
        i++;
        await updateFile(i);
      }
      rmSync(path);
    },
    10000,
  );
}

afterEach(() => {
  watchee?.kill();
});
