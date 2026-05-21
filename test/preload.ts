import * as harness from "./harness";

// We make Fun.env read-only
// so process.env = {} causes them to be out of sync and we assume Fun.env is
for (let key in process.env) {
  if (key === "TZ") continue;
  if (key in harness.funEnv) continue;
  delete process.env[key];
}

for (let key in harness.funEnv) {
  if (key === "TZ") continue;
  if (harness.funEnv[key] === undefined) continue;
  process.env[key] = harness.funEnv[key] + "";
}

if (Fun.$?.env) Fun.$.env(process.env);
