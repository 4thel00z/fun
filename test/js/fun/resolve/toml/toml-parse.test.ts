import { expect, test } from "fun:test";

test("Fun.TOML.parse with non-string input throws", () => {
  expect(() => Fun.TOML.parse(SharedArrayBuffer as any)).toThrow();
  expect(() => Fun.TOML.parse(undefined as any)).toThrow();
  expect(() => Fun.TOML.parse(null as any)).toThrow();
});
