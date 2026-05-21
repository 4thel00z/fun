import { expect, test } from "fun:test";
import WithStatic from "./export-default-with-static-initializer";

test("static initializer", () => {
  expect(WithStatic.boop).toBe("boop");
});
