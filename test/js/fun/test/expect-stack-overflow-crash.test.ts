import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

// Regression test: calling expect matchers after catching a stack overflow
// should not crash with a releaseAssertNoException assertion failure.
test("expect does not crash when called after catching stack overflow", async () => {
  await using proc = Fun.spawn({
    cmd: [
      funExe(),
      "-e",
      `var a=false,b=false;
function r(){r()}
try{r()}catch(e){a=true}
try{Fun.jest().expect(42).toBeFalse()}catch(e){b=true}
if(a&&b)console.log("OK")`,
    ],
    env: funEnv,
    stderr: "pipe",
    stdout: "pipe",
  });

  const [stdout, , exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stdout).toBe("OK\n");
  expect(exitCode).toBe(0);
});
