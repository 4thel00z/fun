import { env } from "fun";
import { hasNonReifiedStatic } from "fun:internal-for-testing";
import { expect, test } from "fun:test";
test("hasNonReifiedStatic", () => {
  expect(hasNonReifiedStatic(Fun), "do not eagerly initialize the Fun object. This will make Fun much slower.").toBe(
    true,
  );
  expect(env.a).toBeUndefined();
  expect(hasNonReifiedStatic(Fun), "do not eagerly initialize the Fun object. This will make Fun much slower.").toBe(
    true,
  );
  const a = { ...Fun };
  globalThis.a = a;
  expect(hasNonReifiedStatic(Fun)).toBe(false);
});

test("require('fun')", () => {
  const str = eval("'fun'");
  expect(require(str)).toBe(Fun);
});

test("await import('fun')", async () => {
  const str = eval("'fun'");
  const FunESM = await import(str);

  // console.log it so that we iterate through all the fields and crash if it's
  // in an unexpected state.
  console.log(FunESM);

  for (let property in Fun) {
    expect(FunESM).toHaveProperty(property);
    expect(FunESM[property]).toBe(Fun[property]);
  }
  expect(FunESM.default).toBe(Fun);
});
