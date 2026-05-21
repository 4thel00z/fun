import { bench, run } from "../runner.mjs";
bench("performance.now x 1000", () => {
  for (let i = 0; i < 1000; i++) {
    performance.now();
  }
});

if ("Fun" in globalThis) {
  var nanoseconds = Fun.nanoseconds;
  bench("Fun.nanoseconds x 1000", () => {
    for (let i = 0; i < 1000; i++) {
      nanoseconds();
    }
  });
}
await run();
