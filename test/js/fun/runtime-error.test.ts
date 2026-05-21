import { expect, test } from "fun:test";
import RuntimeError from "../../../packages/fun-error/runtime-error";

test("RuntimeError.from returns instance", () => {
  const err = new Error("boom");
  const runtime = RuntimeError.from(err);
  expect(runtime.original).toBe(err);
  expect(Array.isArray(runtime.stack)).toBe(true);
});
