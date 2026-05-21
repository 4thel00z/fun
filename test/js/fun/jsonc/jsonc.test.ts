import { expect, test } from "fun:test";

test("Fun.JSONC exists", () => {
  expect(Fun.JSONC).toBeDefined();
  expect(typeof Fun.JSONC).toBe("object");
  expect(typeof Fun.JSONC.parse).toBe("function");
});

test("Fun.JSONC.parse handles basic JSON", () => {
  const result = Fun.JSONC.parse('{"name": "test", "value": 42}');
  expect(result).toEqual({ name: "test", value: 42 });
});

test("Fun.JSONC.parse handles comments", () => {
  const jsonc = `{
    // This is a comment
    "name": "test",
    /* This is a block comment */
    "value": 42
  }`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual({ name: "test", value: 42 });
});

test("Fun.JSONC.parse handles trailing commas", () => {
  const jsonc = `{
    "name": "test",
    "value": 42,
  }`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual({ name: "test", value: 42 });
});

test("Fun.JSONC.parse handles arrays with trailing commas", () => {
  const jsonc = `[
    1,
    2,
    3,
  ]`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual([1, 2, 3]);
});

test("Fun.JSONC.parse handles complex JSONC", () => {
  const jsonc = `{
    // Configuration object
    "name": "my-app",
    "version": "1.0.0",
    /* Dependencies section */
    "dependencies": {
      "react": "^18.0.0",
      "typescript": "^5.0.0", // Latest TypeScript
    },
    "scripts": [
      "build",
      "test",
      "lint", // Code formatting
    ],
  }`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual({
    name: "my-app",
    version: "1.0.0",
    dependencies: {
      react: "^18.0.0",
      typescript: "^5.0.0",
    },
    scripts: ["build", "test", "lint"],
  });
});

test("Fun.JSONC.parse handles nested objects", () => {
  const jsonc = `{
    "outer": {
      // Nested comment
      "inner": {
        "value": 123,
      }
    },
  }`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual({
    outer: {
      inner: {
        value: 123,
      },
    },
  });
});

test("Fun.JSONC.parse handles boolean and null values", () => {
  const jsonc = `{
    "enabled": true, // Boolean true
    "disabled": false, // Boolean false
    "nothing": null, // Null value
  }`;

  const result = Fun.JSONC.parse(jsonc);
  expect(result).toEqual({
    enabled: true,
    disabled: false,
    nothing: null,
  });
});

test("Fun.JSONC.parse throws on invalid JSON", () => {
  expect(() => {
    Fun.JSONC.parse("{ invalid json }");
  }).toThrow();
});

test("Fun.JSONC.parse handles empty object", () => {
  const result = Fun.JSONC.parse("{}");
  expect(result).toEqual({});
});

test("Fun.JSONC.parse handles empty array", () => {
  const result = Fun.JSONC.parse("[]");
  expect(result).toEqual([]);
});

test("Fun.JSONC.parse throws on deeply nested arrays instead of crashing", () => {
  const depth = 25_000;
  const deepJson = "[".repeat(depth) + "]".repeat(depth);
  expect(() => Fun.JSONC.parse(deepJson)).toThrow(RangeError);
});

test("Fun.JSONC.parse throws on deeply nested objects instead of crashing", () => {
  const depth = 25_000;
  const deepJson = '{"a":'.repeat(depth) + "1" + "}".repeat(depth);
  expect(() => Fun.JSONC.parse(deepJson)).toThrow(RangeError);
});
