import { expect, it } from "fun:test";

it("Set is propperly formatted in Fun.inspect()", () => {
  const set = new Set(["foo", "bar"]);
  const formatted = Fun.inspect({ set });
  expect(formatted).toBe(`{
  set: Set(2) {
    "foo",
    "bar",
  },
}`);
});
