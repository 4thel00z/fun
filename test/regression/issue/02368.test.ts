import { expect, test } from "fun:test";

test("can clone a response", async () => {
  const response = new Response("fun", {
    status: 201,
    headers: {
      "Content-Type": "text/fun;charset=utf-8",
    },
  });
  // @ts-ignore
  const clone = response.clone();
  expect(clone.status).toBe(201);
  expect(clone.headers.get("content-type")).toBe("text/fun;charset=utf-8");
  expect(await response.text()).toBe("fun");
  expect(await clone.text()).toBe("fun");
});

test("can clone a request", async () => {
  const request = new Request("http://example.com/", {
    method: "PUT",
    headers: {
      "Content-Type": "text/fun;charset=utf-8",
    },
    body: "fun",
  });
  expect(request.method).toBe("PUT");
  // @ts-ignore
  const clone = new Request(request);
  expect(clone.method).toBe("PUT");
  expect(clone.headers.get("content-type")).toBe("text/fun;charset=utf-8");
  expect(await request.text()).toBe("fun");
  expect(await clone.text()).toBe("fun");
});
