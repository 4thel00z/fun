import { spawnSync } from "fun";
import { describe, expect, test } from "fun:test";
import { funExe } from "harness";

describe("spawnSync with ReadableStream stdin", () => {
  test("spawnSync should throw", () => {
    const stream = new ReadableStream({
      async start(controller) {
        await 42;
        controller.enqueue("test data");
        controller.close();
      },
    });

    expect(() =>
      spawnSync({
        cmd: [funExe()],
        stdin: stream,
        stdout: "pipe",
      }),
    ).toThrowErrorMatchingInlineSnapshot(`"'stdin' ReadableStream cannot be used in sync mode"`);
  });
});
