import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

test("08965", async () => {
  const funs = Array.from(
    { length: 25 },
    () =>
      Fun.spawn({
        cmd: [funExe(), join(import.meta.dir, "1.ts")],
        cwd: import.meta.dir,
        stdio: ["inherit", "inherit", "inherit"],
        env: funEnv,
      }).exited,
  );

  const exited = await Promise.all(funs);
  expect(exited).toEqual(Array.from({ length: 25 }, () => 0));
});
