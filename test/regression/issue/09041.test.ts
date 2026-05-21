import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";

test("09041", async () => {
  let { exited, stderr, stdout } = Fun.spawn({
    cmd: [funExe(), "test", import.meta.dirname + "/09041/09041-fixture.ts"],
    env: funEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderrText = await stderr.text();
  const stdoutText = await stdout.text();
  const exitCode = await exited;

  console.log(`
====== stderr ======
${stderrText}
====== stdout ======  
${stdoutText}
====== exit code ======
${exitCode}
`);

  expect(exitCode).toBe(0);
  const err = stderrText;
  expect(err).toContain("1 pass");
  expect(err).toContain("0 fail");
}, 30000);
