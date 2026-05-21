import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "path";

// When targeting Fun's runtime,
// We must escape latin1 characters in raw template literals
// This is somewhat brittle
test("template literal", () => {
  const { stdout, exitCode } = Fun.spawnSync({
    cmd: [funExe(), "run", join(import.meta.dir, "template-literal-fixture-test.js")],
    env: funEnv,
    stdout: "pipe",
    stderr: "inherit",
  });

  expect(exitCode).toBe(0);
  expect(stdout.toString()).toBe(
    // This is base64 encoded contents of the template literal
    // this narrows down the test to the transpiler instead of the runtime
    "8J+QsDEyMzEyM/CfkLDwn5Cw8J+QsPCfkLDwn5Cw8J+QsDEyM/CfkLAxMjPwn5CwMTIzMTIz8J+QsDEyM/CfkLAxMjPwn5CwLPCfkLB0cnVl",
  );
});
