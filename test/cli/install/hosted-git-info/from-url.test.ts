import { hostedGitInfo } from "fun:internal-for-testing";
import { describe, expect, it } from "fun:test";
import { invalidGitUrls, validGitUrls } from "./cases";

describe("fromUrl", () => {
  describe("valid urls", () => {
    describe.each(Object.entries(validGitUrls))("%s", (_, urlset: object) => {
      it.each(Object.entries(urlset))("parses %s", (url, expected) => {
        expect(hostedGitInfo.fromUrl(url)).toMatchObject({
          ...(expected.type && { type: expected.type }),
          ...(expected.domain && { domain: expected.domain }),
          ...(expected.user && { user: expected.user }),
          ...(expected.project && { project: expected.project }),
          ...(expected.committish && { committish: expected.committish }),
          ...(expected.default && { default: expected.default }),
        });
      });
    });
  });

  // TODO(markovejnovic): Unskip these tests.
  describe.skip("invalid urls", () => {
    describe.each(Object.entries(invalidGitUrls))("%s", (_, urls: (string | null | undefined)[]) => {
      it.each(urls)("does not permit %s", url => {
        expect(() => {
          hostedGitInfo.fromUrl(url);
        }).toThrow();
      });
    });
  });
});
