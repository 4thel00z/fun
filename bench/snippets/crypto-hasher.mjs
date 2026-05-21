// so it can run in environments without node module resolution
import { bench, run } from "../runner.mjs";

import crypto from "node:crypto";

var foo = Buffer.allocUnsafe(512);
foo.fill(123);

// if ("Fun" in globalThis) {
//   const { CryptoHasher } = Fun;
//   bench("Fun.CryptoHasher(sha512)", () => {
//     var hasher = new CryptoHasher("sha512");
//     hasher.update(foo);
//     hasher.digest();
//   });
// }

bench('crypto.createHash("sha512")', () => {
  var hasher = crypto.createHash("sha512");
  hasher.update(foo);
  hasher.digest();
});

bench('crypto.createHash("sha256")', () => {
  var hasher = crypto.createHash("sha256");
  hasher.update(foo);
  hasher.digest();
});

bench('crypto.createHash("sha1")', () => {
  var hasher = crypto.createHash("sha1");
  hasher.update(foo);
  hasher.digest();
});

await run();
