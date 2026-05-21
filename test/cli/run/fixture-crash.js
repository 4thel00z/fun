let crash_handler;
try {
  crash_handler = require("fun:internal-for-testing").crash_handler;
} catch {
  console.error("This version of fun does not have internal-for-testing exposed");
  console.error("FUN_GARBAGE_COLLECTOR_LEVEL=0 FUN_FEATURE_FLAG_INTERNAL_FOR_TESTING=1 fun");
  process.exit(1);
}

const approach = process.argv[2];
if (approach in crash_handler) {
  crash_handler[approach]();
} else {
  console.error("usage: fun fixture-crash.js <segfault|panic|rootError|outOfMemory|raiseIgnoringPanicHandler>");
}
