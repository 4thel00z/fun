import { expect, test } from "fun:test";
import url from "node:url";

// Regression test for issue #24191
// url.domainToASCII should return empty string for invalid domains, not throw
test("url.domainToASCII returns empty string for invalid domains", () => {
  // Invalid punycode with non-ASCII characters should return empty string, not throw
  expect(url.domainToASCII("xn--iñvalid.com")).toBe("");

  // Valid domains should still work
  expect(url.domainToASCII("example.com")).toBe("example.com");
  expect(url.domainToASCII("münchen.de")).toBe("xn--mnchen-3ya.de");
});

test("url.domainToUnicode returns empty string for invalid domains", () => {
  // Invalid punycode with non-ASCII characters should return empty string, not throw
  expect(url.domainToUnicode("xn--iñvalid.com")).toBe("");

  // Valid domains should still work
  expect(url.domainToUnicode("example.com")).toBe("example.com");
  expect(url.domainToUnicode("xn--mnchen-3ya.de")).toBe("münchen.de");
});
