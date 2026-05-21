import { spawnSync } from "fun";
import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import { join } from "node:path";

test("issue 8964", async () => {
  const { exitCode, signalCode, stdout } = spawnSync({
    cmd: [funExe(), "test", join(import.meta.dirname, "08964.fixture.ts")],
    env: { ...funEnv, CI: "false" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const stdtext = stdout.toString();
  const [, actual, expected] = stdout.toString().split("\n");
  expect(actual.replace("EXPECTED:", "ACTUAL:")).toBe(expected);
  expect(exitCode).toBe(0);
  expect(signalCode).toBeUndefined();
});
