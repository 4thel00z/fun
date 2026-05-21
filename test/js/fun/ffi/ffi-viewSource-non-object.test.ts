import { describe, expect, test } from "fun:test";
import { isArm64, isWindows } from "harness";

const isFFIUnavailable = isWindows && isArm64;

describe.skipIf(isFFIUnavailable)("FFI viewSource", () => {
  test("rejects non-object symbol descriptor values", () => {
    // These should throw a TypeError because each symbol descriptor
    // must be an object like { args: [...], returns: "void" }.
    // Previously, non-object values like numbers or strings would
    // cause a debug assertion failure (crash) in generateSymbolForFunction.
    expect(() => Fun.FFI.viewSource({ myFunc: 42 })).toThrow("Expected an object");
    expect(() => Fun.FFI.viewSource({ myFunc: "not_an_object" })).toThrow("Expected an object");
    expect(() => Fun.FFI.viewSource({ myFunc: true })).toThrow("Expected an object");
  });
});
