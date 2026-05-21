import { describe, expect, it, test } from "fun:test";

describe("UTF-8 BOM should be ignored", () => {
  test("handles empty strings", async () => {
    const blob = new Response(new Blob([Buffer.from([0xef, 0xbb, 0xbf])]));

    expect(await blob.text()).toHaveLength(0);
    expect(async () => await blob.json()).toThrow();
  });

  test("handles UTF8 BOM + emoji", async () => {
    const blob = new Response(new Blob([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("🌎")]));

    expect(await blob.text()).toHaveLength(2);
    expect(async () => await blob.json()).toThrow();
  });

  describe("Blob", () => {
    describe("with emoji", () => {
      it("in text()", async () => {
        const blob = new Blob(["\uFEFFHello, World! 🌎"], { type: "text/plain" });
        expect(await blob.text()).toBe("Hello, World! 🌎");
      });

      it("in json()", async () => {
        const blob = new Blob(['\uFEFF{"hello":"World 🌎"}'], { type: "application/json" });
        expect(await blob.json()).toStrictEqual({ "hello": "World 🌎" } as any);
      });

      it("in formData()", async () => {
        const blob = new Blob(["\uFEFFhello=world 🌎"], { type: "application/x-www-form-urlencoded" });
        const formData = await blob.formData();
        expect(formData.get("hello")).toBe("world 🌎");
      });
    });

    it("in text()", async () => {
      const blob = new Blob(["\uFEFFHello, World!"], { type: "text/plain" });
      expect(await blob.text()).toBe("Hello, World!");
    });

    it("in json()", async () => {
      const blob = new Blob(['\uFEFF{"hello":"World"}'], { type: "application/json" });
      expect(await blob.json()).toEqual({ "hello": "World" } as any);
    });

    it("in formData()", async () => {
      const blob = new Blob(["\uFEFFhello=world"], { type: "application/x-www-form-urlencoded" });
      const formData = await blob.formData();
      expect(formData.get("hello")).toBe("world");
    });
  });

  describe("Response", () => {
    it("in text()", async () => {
      const response = new Response(Buffer.from("\uFEFFHello, World!"), { headers: { "content-type": "text/plain" } });
      expect(await response.text()).toBe("Hello, World!");
    });

    it("in json()", async () => {
      const response = new Response(Buffer.from('\uFEFF{"hello":"World"}'), {
        headers: { "content-type": "application/json" },
      });
      expect(await response.json()).toEqual({ "hello": "World" } as any);
    });

    it("in formData()", async () => {
      const response = new Response(Buffer.from("\uFEFFhello=world"), {
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
      const formData = await response.formData();
      expect(formData.get("hello")).toBe("world");
    });
  });

  describe("Request", () => {
    it("in text()", async () => {
      const request = new Request("https://example.com", {
        body: Buffer.from("\uFEFFHello, World!"),
        headers: { "content-type": "text/plain" },
      });
      expect(await request.text()).toBe("Hello, World!");
    });

    it("in json()", async () => {
      const request = new Request("https://example.com", {
        body: Buffer.from('\uFEFF{"hello":"World"}'),
        headers: { "content-type": "application/json" },
      });
      expect(await request.json()).toEqual({ "hello": "World" } as any);
    });

    it("in formData()", async () => {
      const request = new Request("https://example.com", {
        body: Buffer.from("\uFEFFhello=world"),
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
      const formData = await request.formData();
      expect(formData.get("hello")).toBe("world");
    });
  });

  describe("readable stream", () => {
    it("in Fun.readableStreamToText()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("\uFEFFHello, World!"));
          controller.close();
        },
      });
      expect(await Fun.readableStreamToText(stream)).toBe("Hello, World!");
    });

    it("in Fun.readableStreamToJSON()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('\uFEFF{"hello":"World"}'));
          controller.close();
        },
      });
      expect(await Fun.readableStreamToJSON(stream)).toEqual({ "hello": "World" } as any);
    });

    it("in ReadableStream.prototype.text()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("\uFEFFHello, World!"));
          controller.close();
        },
      });
      expect(await stream.text()).toBe("Hello, World!");
    });

    it("in ReadableStream.prototype.json()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from('\uFEFF{"hello":"World"}'));
          controller.close();
        },
      });
      expect(await stream.json()).toEqual({ "hello": "World" });
    });

    it("in Fun.readableStreamToFormData()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("\uFEFFhello=world"));
          controller.close();
        },
      });
      const formData = await Fun.readableStreamToFormData(stream);
      expect(formData.get("hello")).toBe("world");
    });

    it("in Fun.readableStreamToBlob()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("\uFEFFHello, World!"));
          controller.close();
        },
      });
      const blob = await Fun.readableStreamToBlob(stream);
      expect(await blob.text()).toBe("Hello, World!");
    });

    it("in ReadableStream.prototype.blob()", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from("\uFEFFHello, World!"));
          controller.close();
        },
      });
      const blob = await stream.blob();
      expect(await blob.text()).toBe("Hello, World!");
    });
  });
});
