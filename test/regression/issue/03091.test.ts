import { expect, test } from "fun:test";

test("global defines should not be replaced with undefined", () => {
  expect(typeof Symbol["for"]).toBe("function");
});
