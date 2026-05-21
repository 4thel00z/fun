import { expect, test } from "fun:test";
import { Request } from "node-fetch";

test("new Request('/') works with node-fetch", () => {
  expect(() => new Request("/")).not.toThrow();
  expect(new Request("/").url).toBe("/");
});
