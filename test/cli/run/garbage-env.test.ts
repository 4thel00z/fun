import { describe, expect, test } from "fun:test";
import { funExe, isPosix } from "harness";
import path from "path";

describe.if(isPosix)("garbage env", () => {
  test("garbage env", async () => {
    const cfile = path.join(import.meta.dirname, "garbage-env.c");
    {
      const cc = Fun.which("clang") || Fun.which("gcc") || Fun.which("cc");
      const { exitCode, stderr } = await Fun.$`${cc} -o garbage-env ${cfile}`;
      const stderrText = stderr.toString();
      if (stderrText.length > 0) {
        console.error(stderrText);
      }
      expect(exitCode).toBe(0);
    }

    const { exitCode, stderr } = await Fun.$`./garbage-env`.env({ FUN_PATH: funExe() });
    const stderrText = stderr.toString();
    if (stderrText.length > 0) {
      console.error(stderrText);
    }
    expect(exitCode).toBe(0);
  });
});
