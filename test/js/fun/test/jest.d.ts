/// <reference path="../../../../packages/fun-types/test-globals.d.ts" />

// Eventually move these to @types/fun somehow
interface ReadableStream {
  text(): Promise<string>;
  json(): Promise<unknown>;
  blob(): Promise<Blob>;
  bytes(): Promise<Uint8Array<ArrayBuffer>>;
}

declare module "fun" {
  function jest(path: string): typeof import("fun:test");
}
