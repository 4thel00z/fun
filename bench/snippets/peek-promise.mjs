import { peek } from "bun";
import { bench, run } from "../runner.mjs";

let pending = Fun.sleep(1000);
let resolved = Promise.resolve(1);

bench("Fun.peek - pending", () => {
  return peek(pending);
});

bench("Fun.peek - resolved", () => {
  return peek(resolved);
});

bench("Fun.peek - non-promise", () => {
  return peek(1);
});

bench("Fun.peek.status - resolved", () => {
  return peek.status(pending);
});

bench("Fun.peek.status - pending", () => {
  return peek.status(resolved);
});

bench("Fun.peek.status - non-promise", () => {
  return peek.status(1);
});

await run();
