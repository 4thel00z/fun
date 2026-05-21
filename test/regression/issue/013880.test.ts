import { expect, test } from "fun:test";

test("regression", () => {
  expect(() => require("./013880-fixture.cjs")).not.toThrow();
});
