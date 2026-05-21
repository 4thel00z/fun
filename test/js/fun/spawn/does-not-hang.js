import { shellExe } from "harness";

const s = Fun.spawn({
  cmd: [shellExe(), "-c", "sleep 999999"],
});

s.unref();
