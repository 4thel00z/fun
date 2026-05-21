import { expect, test } from "fun:test";
import "harness";
import { fileURLToPath } from "url";

test("Subprocess stdout can be used in Fun.serve()", async () => {
  expect([fileURLToPath(import.meta.resolve("./spawn-stream-http-fixture.js"))]).toRun("hello world");
});
