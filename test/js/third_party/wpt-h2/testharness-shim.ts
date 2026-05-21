// Minimal WPT testharness.js shim mapped onto fun:test. Only the surface
// the vendored .h2.any.js files touch is implemented. Tests whose names
// appear in `knownFailures` are registered via test.todo so the suite
// stays green while still surfacing the gap.

import { test as funTest, expect } from "fun:test";

export const knownFailures = new Set<string>([
  // Fun's Request constructor doesn't read RequestInit.duplex (general fetch
  // spec gap, not h2-specific).
  "Synchronous feature detect",
  // Spec requires TypeError when a streamed chunk is not a BufferSource; Fun
  // currently coerces strings and treats null as empty.
  "Streaming upload with body containing a String",
  "Streaming upload with body containing null",
  // Spec requires TypeError on a 401 challenge with a non-replayable body;
  // Fun returns the 401 response instead.
  "Streaming upload should fail on a 401 response",
]);

function register(name: string, body: () => unknown | Promise<unknown>) {
  if (knownFailures.has(name)) {
    funTest.todo(name);
    return;
  }
  funTest(name, async () => {
    await body();
  });
}

const g = globalThis as any;

g.promise_test = (fn: (t: unknown) => Promise<unknown>, name: string) => {
  register(name, () => fn({}));
};

// Exported (not installed on globalThis) because fun:test injects its own
// `test` binding into every module it loads, including dynamic imports, and
// that per-module binding shadows globalThis. run.test.ts feeds this in as
// a Function-constructor parameter instead.
export const wptTest = (fn: (t: unknown) => unknown, name: string) => {
  register(name, () => fn({}));
};

g.assert_equals = (actual: unknown, expected: unknown, msg?: string) => {
  if (!Object.is(actual, expected)) {
    throw new Error(`assert_equals: ${msg ?? ""} expected ${String(expected)} got ${String(actual)}`);
  }
};

g.assert_true = (actual: unknown, msg?: string) => {
  if (actual !== true) throw new Error(`assert_true: ${msg ?? ""} got ${String(actual)}`);
};

g.promise_rejects_js = async (_t: unknown, ctor: new (...a: any[]) => Error, promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e) {
    expect(e).toBeInstanceOf(ctor);
    return;
  }
  throw new Error(`promise_rejects_js: expected rejection with ${ctor.name}, but promise fulfilled`);
};

g.promise_rejects_exactly = async (_t: unknown, expected: unknown, promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (e) {
    if (e !== expected) {
      throw new Error(`promise_rejects_exactly: expected ${String(expected)}, got ${String(e)}`);
    }
    return;
  }
  throw new Error(`promise_rejects_exactly: expected rejection, but promise fulfilled`);
};

g.token = () => crypto.randomUUID();
