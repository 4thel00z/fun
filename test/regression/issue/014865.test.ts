import { expect, test } from "fun:test";
import { Request } from "node-fetch";

test("node fetch Request URL field is set even with a valid URL", () => {
  expect(new Request("/").url).toBe("/");
  expect(new Request("https://fun.dev/").url).toBe("https://fun.dev/");
  expect(new Request(new URL("https://fun.dev/")).url).toBe("https://fun.dev/");
});
