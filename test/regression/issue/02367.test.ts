import { expect, test } from "fun:test";

test("should not be able to parse json from empty body", () => {
  expect(async () => await new Response().json()).toThrow(SyntaxError);
  expect(async () => await new Request("http://example.com/").json()).toThrow(SyntaxError);
});
