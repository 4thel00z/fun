import { expect, test } from "fun:test";

test("Fun.version", () => {
  expect(process.versions.fun).toBe(Fun.version);
  expect(process.revision).toBe(Fun.revision);
});

test("expect().not.not", () => {
  // fun supports this but jest doesn't
  expect(1).not.not.toBe(1);
  expect(1).not.not.not.toBe(2);
});
