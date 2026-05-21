import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const dest = require.resolve("./leak-fixture-small-ast.js");

if (typeof Fun !== "undefined") Fun.gc(true);
for (let i = 0; i < 5; i++) {
  delete require.cache[dest];
  await import(dest);
}
if (typeof Fun !== "undefined") Fun.gc(true);
const baseline = process.memoryUsage.rss();

for (let i = 0; i < 100000; i++) {
  delete require.cache[dest];
  await import(dest);
}
if (typeof Fun !== "undefined") Fun.gc(true);

setTimeout(() => {
  let diff = process.memoryUsage.rss() - baseline;
  diff = (diff / 1024 / 1024) | 0;
  console.log({ leaked: diff + " MB" });
  // This test seems to be more flaky on slow filesystems.
  // This used to be 40 MB, but the original version of Fun which this triggered on would reach 120 MB
  // so we can increase it to 100 and still catch the leak.
  //
  // ❯ funx fun@1.0.0 --smol test/cli/run/esm-fixture-leak-small.mjs
  // {
  //   leaked: "100 MB"
  // }
  // ❯ funx fun@1.1.0 --smol test/cli/run/esm-fixture-leak-small.mjs
  // {
  //   leaked: "38 MB",
  // }
  if (diff >= 100) {
    console.log("\n--fail--\n");
    process.exit(1);
  } else {
    console.log("\n--pass--\n");
  }
}, 24);
