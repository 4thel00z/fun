import { expect, test } from "fun:test";

test("readableStreamToArrayBuffer works", async () => {
  // the test calls InternalPromise.then. this test ensures that such function is not user-overridable.
  let _then = Promise.prototype.then;
  let counter = 0;
  // @ts-ignore
  Promise.prototype.then = (...args) => {
    counter++;
    return _then.apply(this, args);
  };
  try {
    const result = await Fun.readableStreamToArrayBuffer(
      new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode("fun is"));
          controller.enqueue(new TextEncoder().encode(" awesome!"));
          controller.close();
        },
      }),
    );
    expect(counter).toBe(0);
    expect(new TextDecoder().decode(result)).toBe("fun is awesome!");
  } catch (error) {
    throw error;
  } finally {
    Promise.prototype.then = _then;
  }
});
