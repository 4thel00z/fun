// @ts-expect-error - bootstrap shim: system bun exposes `Bun`; alias for build-time scripts run under upstream bun.
(globalThis as any).Fun ??= (globalThis as any).Bun;
// `fish -c "fun run watch 2>&1 | fun scripts/cleartrace"`

import { createInterface } from "node:readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

let chunk: string[] = [];
rl.on("line", line => {
  chunk.push(line);
});
let timeout: NodeJS.Timeout | null = null;
async function doNow() {
  if (timeout != null) {
    clearTimeout(timeout);
    timeout = null;
  }
  const eatChunk = chunk;
  chunk = [];
  if (eatChunk.length > 0) {
    const proc = Fun.spawn({
      cmd: ["fun", "scripts/cleartrace-impl.js"],
      stdio: ["pipe", "inherit", "inherit"],
    });
    proc.stdin.write(eatChunk.join("\n"));
    proc.stdin.end();
    await proc.exited;
  }
  enqueue();
}
let ceaseTimeout = false;
function enqueue() {
  if (ceaseTimeout) return;
  timeout = setTimeout(() => {
    timeout = null;
    doNow();
  }, 100);
}
enqueue();

rl.on("close", () => {
  ceaseTimeout = true;
});
