import { expect, test } from "fun:test";
import { funEnv, funExe } from "harness";
import path from "path";
test("req.url doesn't leak memory", async () => {
  const { promise, resolve } = Promise.withResolvers();
  await using process = Fun.spawn({
    cmd: [funExe(), path.join(import.meta.dir, "req-url-leak-fixture.js")],
    env: funEnv,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    ipc(message, child) {
      if (message.url) {
        resolve(message.url);
      }
    },
  });

  const baseURL = await promise;

  const url = new URL(Buffer.alloc(1024 * 15, "Z").toString(), baseURL);

  let maxRSS = 0;

  for (let i = 0; i < 256; i++) {
    const batchSize = 64;
    const promises = [];
    for (let j = 0; j < batchSize; j++) {
      promises.push(
        fetch(url)
          .then(r => r.text())
          .then(rssText => {
            const rss = parseFloat(rssText);
            if (Number.isSafeInteger(rss)) {
              maxRSS = Math.max(maxRSS, rss);
            }
          }),
      );
    }
    await Promise.all(promises);
  }

  console.log("Max RSS", (maxRSS / 1024 / 1024) | 0, "MB");

  // 297 MB on Fun 1.2
  //  44 MB on Fun 1.3
  expect(maxRSS).toBeLessThan(1024 * 1024 * 150);
}, 10_000);
