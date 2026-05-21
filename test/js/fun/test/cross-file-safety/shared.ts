import { expect } from "fun:test";

let expectValue = undefined;

export function getExpectValue() {
  return (expectValue ??= expect(25));
}
