import { expect, test } from "fun:test";
import { funExe } from "harness";

test("23077", async () => {
  await using result = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dir + "/a.fixture.ts", import.meta.dir + "/b.fixture.ts"],
    stdio: ["pipe", "pipe", "pipe"],
  });
  const exitCode = await result.exited;
  const stdout = await result.stdout.text();
  const stderr = await result.stderr.text();
  expect(stderr).toInclude(" 2 pass");
  expect(exitCode).toBe(0);
});
