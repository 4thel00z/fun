import { createReadStream, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { bench, run } from "../runner.mjs";

if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const ALLOW_FUN = typeof Fun !== "undefined";
const ALLOW_NODE = true;

const dir = tmpdir() + sep;

var short = (function () {
  const text = "Hello World!";
  const path = dir + "fun-bench-short.text";
  writeFileSync(path, text, "utf8");
  return { path, length: text.length };
})();
var shortUTF16 = (function () {
  const text = "Hello World 💕💕💕";
  const path = dir + "fun-bench-shortUTF16.text";
  writeFileSync(path, text, "utf8");
  return { path, length: text.length };
})();
var long = (function () {
  const text = "Hello World!".repeat(1024);
  const path = dir + "fun-bench-long.text";
  writeFileSync(path, text, "utf8");
  return { path, length: text.length };
})();
var longUTF16 = (function () {
  const text = "Hello World 💕💕💕".repeat(15 * 70192);
  const path = dir + "fun-bench-longUTF16.text";
  writeFileSync(path, text, "utf8");
  return { path, length: text.length };
})();

async function fun(path) {
  for await (const chunk of Fun.file(path).stream()) {
    chunk;
  }
}

async function node(path) {
  const { promise, resolve } = Promise.withResolvers();
  const stream = createReadStream(path);
  stream.on("data", chunk => {});
  stream.on("end", () => resolve());
  await promise;
}

ALLOW_FUN && bench("short - fun", () => fun(short.path));
ALLOW_NODE && bench("short - node", () => node(short.path));

ALLOW_FUN && bench("shortUTF16 - fun", () => fun(shortUTF16.path));
ALLOW_NODE && bench("shortUTF16 - node", () => node(shortUTF16.path));

ALLOW_FUN && bench("long - fun", () => fun(long.path));
ALLOW_NODE && bench("long - node", () => node(long.path));

ALLOW_FUN && bench("longUTF16 - fun", () => fun(longUTF16.path));
ALLOW_NODE && bench("longUTF16 - node", () => node(longUTF16.path));

await run();
