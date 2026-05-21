import { describe, it } from "fun:test";

describe("bar", () => {
  it("should not run", () => {
    console.log("bar: this test should not run");
  });
  describe("inner describe", () => {
    it("should not run", () => {
      console.log("inner bar: this test should not run");
    });
  });
});
