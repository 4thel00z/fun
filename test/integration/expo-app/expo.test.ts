import { beforeAll, expect, setDefaultTimeout, test } from "fun:test";
import fs from "fs/promises";
import { funEnv, funExe, tmpdirSync } from "../../harness";

const tmpdir = tmpdirSync();

beforeAll(async () => {
  setDefaultTimeout(1000 * 60 * 4);
  await fs.rm(tmpdir, { recursive: true, force: true });
  await fs.cp(import.meta.dir, tmpdir, { recursive: true, force: true });
});

test("expo export works (no ajv issues)", async () => {
  console.log({ tmpdir });
  let { exitCode } = Fun.spawnSync([funExe(), "install"], {
    stderr: "inherit",
    stdout: "inherit",
    cwd: tmpdir,
    env: funEnv,
  });
  expect(exitCode).toBe(0);

  ({ exitCode } = Fun.spawnSync([funExe(), "run", "export"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    cwd: tmpdir,
    env: {
      ...funEnv,
      PORT: "0",
    },
  }));

  // just check exit code for now
  expect(exitCode).toBe(0);
});
