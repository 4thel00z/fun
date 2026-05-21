import { expect, test } from "fun:test";

// https://github.com/underdoc-org/fun/issues/27575
// Fun.Transpiler ignored experimentalDecorators: true from tsconfig,
// always emitting TC39-style decorators instead of legacy TypeScript decorators.

test("Fun.Transpiler respects experimentalDecorators: true from tsconfig", () => {
  const transpiler = new Fun.Transpiler({
    loader: "ts",
    target: "browser",
    tsconfig: JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
      },
    }),
  });

  const code = `
function Prop() { return function(target: any, key: string) {}; }

class Foo {
  @Prop() bar: number = 0;
}
`;

  const result = transpiler.transformSync(code);

  // Legacy decorators use __legacyDecorateClassTS, NOT TC39 helpers
  expect(result).not.toContain("__decorateElement");
  expect(result).not.toContain("__decoratorStart");
  expect(result).not.toContain("__runInitializers");

  // Legacy decorators produce __legacyDecorateClassTS calls
  expect(result).toContain("__legacyDecorateClassTS");
});

test("Fun.Transpiler respects emitDecoratorMetadata: true from tsconfig", () => {
  const transpiler = new Fun.Transpiler({
    loader: "ts",
    target: "browser",
    tsconfig: JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }),
  });

  const code = `
function Dec() { return function(target: any, key: string) {}; }

class Foo {
  @Dec() bar: string = "";
}
`;

  const result = transpiler.transformSync(code);

  // Should emit legacy decorators with metadata
  expect(result).not.toContain("__decorateElement");
  expect(result).toContain("__legacyDecorateClassTS");
  expect(result).toContain("__legacyMetadataTS");
});

test("Fun.Transpiler emits TC39 decorators when experimentalDecorators is not set", () => {
  const transpiler = new Fun.Transpiler({
    loader: "ts",
    target: "browser",
    tsconfig: JSON.stringify({
      compilerOptions: {},
    }),
  });

  const code = `
function Prop() { return function(target: any, key: string) {}; }

class Foo {
  @Prop() bar: number = 0;
}
`;

  const result = transpiler.transformSync(code);

  // TC39 decorators use __decorateElement / __decoratorStart / __runInitializers
  expect(result).toContain("__decorateElement");
  expect(result).not.toContain("__legacyDecorateClassTS");
});

test("Fun.Transpiler.transform (async) respects experimentalDecorators: true", async () => {
  const transpiler = new Fun.Transpiler({
    loader: "ts",
    target: "browser",
    tsconfig: JSON.stringify({
      compilerOptions: {
        experimentalDecorators: true,
      },
    }),
  });

  const code = `
function Prop() { return function(target: any, key: string) {}; }

class Foo {
  @Prop() bar: number = 0;
}
`;

  const result = await transpiler.transform(code);

  // Legacy decorators use __legacyDecorateClassTS, NOT TC39 helpers
  expect(result).not.toContain("__decorateElement");
  expect(result).not.toContain("__decoratorStart");
  expect(result).not.toContain("__runInitializers");
  expect(result).toContain("__legacyDecorateClassTS");
});
