const { spawn } = require("child_process");

if (!process.env.WITHOUT_WAITER_THREAD) {
  if (!process.env.FUN_GARBAGE_COLLECTOR_LEVEL || !process.env.FUN_FEATURE_FLAG_FORCE_WAITER_THREAD) {
    throw new Error("This test must be run with FUN_GARBAGE_COLLECTOR_LEVEL and FUN_FEATURE_FLAG_FORCE_WAITER_THREAD");
  }
}

spawn(process.argv0, ["-e", "Fun.sleepSync(999999999)"]);
