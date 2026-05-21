import { spawn } from "fun";
import { funEnv, funExe } from "harness";
import { join } from "node:path";

// prior, this would hang on Windows if you ran this with a pipe

const run = spawn({
  cmd: [funExe(), "--watch", join(import.meta.dirname, "empty.js")],
  stdout: "inherit",
  stderr: "inherit",
  stdin: "ignore",
  env: funEnv,
});
await Fun.sleep(250);
run.kill(9);
await run.exited;
