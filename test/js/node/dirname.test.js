import { expect, it } from "fun:test";

it("__dirname should work", () => {
  expect(import.meta.dir).toBe(__dirname);
});

it("__filename should work", () => {
  expect(import.meta.path).toBe(__filename);
});
