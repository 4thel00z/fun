import { expect } from "fun:test";

expect.extend({
  toBeGoat(actual, expected, message) {
    return {
      pass: actual === "goat",
      message: () => `expected ${actual} to be goat`,
    };
  },
});
