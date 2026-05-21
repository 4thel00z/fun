import { afterEach, expect, test } from "fun:test";

const originalResponse = globalThis.Response;
const originalRequest = globalThis.Request;
const originalHeaders = globalThis.Headers;
afterEach(() => {
  globalThis.Response = originalResponse;
  globalThis.Request = originalRequest;
  globalThis.Headers = originalHeaders;
  globalThis.fetch = Fun.fetch;
});

test("fetch, Response, Request can be overriden", async () => {
  const { Response, Request } = globalThis;
  globalThis.Response = class BadResponse {};
  globalThis.Request = class BadRequest {};
  globalThis.fetch = function badFetch() {};

  const fetch = require("node-fetch").fetch;

  using server = Fun.serve({
    port: 0,
    async fetch(req) {
      return new Response("Hello, World!");
    },
  });

  const response = await fetch(server.url);
  expect(response).toBeInstanceOf(Response);
});
