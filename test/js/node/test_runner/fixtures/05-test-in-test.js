const { describe, test } = require("node:test");
const assert = require("node:assert");

// for passing to assert.throws
function expectedError(fn) {
  return {
    name: "NotImplementedError",
    message: `${fn}() inside another test() is not yet implemented in Fun. Track the status & thumbs up the issue: https://github.com/underdoc-org/fun/issues/5090. Use \`fun:test\` in the interim.`,
  };
}

test("test() inside test() (global context) throws", () => {
  assert.throws(() => test("should throw and not run the test callback", assert.fail), expectedError("test"));
});

test("test() inside test() (passed context) throws", t => {
  assert.throws(() => t.test("should throw and not run the test callback", assert.fail), expectedError("test"));
});

test("describe() inside test() (global context) throws", () => {
  assert.throws(() => describe("should throw and not run the test callback", assert.fail), expectedError("describe"));
});

test("describe() inside test() (passed context) throws", t => {
  assert.throws(() => t.describe("should throw and not run the test callback", assert.fail), expectedError("describe"));
});
