import { expect, test } from "fun:test";
import "harness";
import { join } from "node:path";

test("https://github.com/underdoc-org/fun/issues/11866", async () => {
  expect([join(import.meta.dirname, "11866.ts")]).toRun();
});
