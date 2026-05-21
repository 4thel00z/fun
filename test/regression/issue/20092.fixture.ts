import { describe, expect, test } from "fun:test";

describe.each(["foo", "bar"])("%s", () => {
  test.only("works", () => {
    expect(1).toBe(1);
  });
});
