const { test, expect } = require("fun:test");

test.each([[]])("%p", array => {
  expect(array.length).toBe(0);
});
