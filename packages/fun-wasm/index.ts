import { ByteBuffer } from "peechy/bb";
import {
  Loader as FunLoader,
  TestKind,
  decodeGetTestsResponse,
  decodeScanResult,
  decodeTransformResponse,
  encodeGetTestsRequest,
  encodeScan,
  encodeTransform,
  type ScanResult,
  type TransformResponse,
} from "./schema.js";

export enum Loader {
  jsx = FunLoader.jsx,
  js = FunLoader.js,
  tsx = FunLoader.tsx,
  ts = FunLoader.ts,
}
export interface TestReference {
  name: string;
  byteOffset: number;
  kind: "test" | "describe";
}
export type { ScanResult, TransformResponse };

const testKindMap = {
  [TestKind.describe_fn]: "describe",
  [TestKind.test_fn]: "test",
};
const capturedErrors: string[] = [];
let captureErrors = false;

function normalizeLoader(file_name: string, loader?: keyof typeof Loader): FunLoader {
  return (
    (loader
      ? {
          jsx: FunLoader.jsx,
          tsx: FunLoader.tsx,
          ts: FunLoader.ts,
          js: FunLoader.js,
        }[loader]
      : null) ||
    {
      ".jsx": FunLoader.jsx,
      ".tsx": FunLoader.tsx,
      ".ts": FunLoader.ts,
      ".js": FunLoader.js,
    }[file_name.substring(file_name.lastIndexOf("."))] ||
    FunLoader.js
  );
}

interface WebAssemblyModule {
  init(heapSize: number): number;
  transform(a: bigint): bigint;
  fun_malloc(a: number | bigint): bigint;
  fun_free(a: bigint): void;
  scan(a: bigint): bigint;
  getTests(a: bigint): bigint;
}

const Wasi = {
  clock_time_get(clk_id: unknown, tp: unknown) {
    return Date.now();
  },
  environ_sizes_get() {
    return 0;
  },
  environ_get(__environ: unknown, environ_buf: unknown) {
    return 0;
  },

  fd_close(fd: number) {
    return 0;
  },
  proc_exit() {},

  fd_seek(fd: number, offset_bigint: bigint, whence: unknown, newOffset: unknown) {},
  fd_write(fd: unknown, iov: unknown, iovcnt: unknown, pnum: unknown) {},
};

const env = {
  console_log(slice: bigint) {
    // @ts-expect-error
    const text = Fun._wasmPtrLenToString(slice);
    if (captureErrors) {
      capturedErrors.push(text);
      return;
    }
    console.log(text);
  },
  console_error(slice: bigint) {
    // @ts-expect-error
    const text = Fun._wasmPtrLenToString(slice);
    if (captureErrors) {
      capturedErrors.push(text);
      return;
    }
    console.error(text);
  },
  console_warn(slice: bigint) {
    // @ts-expect-error
    console.warn(Fun._wasmPtrLenToString(slice));
  },
  console_info(slice: bigint) {
    // @ts-expect-error
    console.info(Fun._wasmPtrLenToString(slice));
  },
  __indirect_function_table: new WebAssembly.Table({
    initial: 0,
    element: "anyfunc",
  }),
  __stack_pointer: new WebAssembly.Global({
    mutable: true,
    value: "i32",
  }),
  __multi3(one: number, two: number) {
    return Math.imul(one | 0, two | 0);
  },
  fmod(one: number, two: number) {
    return one % two;
  },
  memset(ptr: number, value: number, len: number) {
    // @ts-expect-error
    Fun.memory_array.fill(value, ptr, ptr + len);
  },
  memcpy(ptr: number, value: number, len: number) {
    // @ts-expect-error
    Fun.memory_array.copyWithin(ptr, value, value + len);
  },
  // These functions convert a to an unsigned long long, rounding toward zero. Negative values all become zero.
  __fixunsdfti(a: number) {
    return Math.floor(a);
  },
  // These functions return the remainder of the unsigned division of a and b.
  __umodti3(a: number, b: number) {
    return (a | 0) % (b | 0);
  },
  // These functions return the quotient of the unsigned division of a and b.
  __udivti3(a: number, b: number) {
    return (a | 0) / (b | 0);
  },
  // These functions return the result of shifting a left by b bits.
  __ashlti3(a: number, b: number) {
    return (a | 0) >> (b | 0);
  },
  /* Returns: convert a to a double, rounding toward even. */
  __floatuntidf(a: number) {
    const mod = a % 2;
    if (mod === 0) {
      return Math.ceil(a);
    } else if (mod === 1) {
      return Math.floor(a);
    }
  },
  emscripten_notify_memory_growth() {},
};

export class Fun {
  private static has_initialized = false;
  private static wasm_source: WebAssembly.WebAssemblyInstantiatedSource;
  private static get wasm_exports(): WebAssemblyModule {
    return Fun.wasm_source.instance.exports as unknown as WebAssemblyModule;
  }

  private static get memory(): WebAssembly.Memory {
    return Fun.wasm_source.instance.exports.memory as WebAssembly.Memory;
  }

  private static scratch: Uint8Array = new Uint8Array(8192);
  private static memory_array: Uint8Array;

  private static _decoder: TextDecoder;
  private static _encoder: TextEncoder = new TextEncoder();

  private static ptr_converter = new ArrayBuffer(16);
  private static ptr_float = new BigUint64Array(Fun.ptr_converter);
  private static ptr_slice = new Uint32Array(Fun.ptr_converter);

  private static _wasmPtrToSlice(offset: bigint) {
    Fun.ptr_float[0] = typeof offset === "number" ? BigInt(offset) : offset;
    return new Uint8Array(Fun.memory.buffer, Fun.ptr_slice[0], Fun.ptr_slice[1]);
  }

  private static _wasmPtrLenToString(slice: bigint) {
    if (!Fun._decoder) {
      Fun._decoder = new TextDecoder("utf8");
    }

    const region = Fun._wasmPtrToSlice(slice);
    return Fun._decoder.decode(region);
  }

  static async init(url?: URL | string | null, heapSize = 64_000_000, fetch = globalThis.fetch) {
    if (Fun.has_initialized) return;
    url ??= new URL("./fun.wasm", import.meta.url);

    if (typeof process === "undefined") {
      if (globalThis.WebAssembly.instantiateStreaming) {
        Fun.wasm_source = await globalThis.WebAssembly.instantiateStreaming(fetch(url), {
          env: env,
          wasi_snapshot_preview1: Wasi,
        });
      } else if (typeof window !== "undefined") {
        const resp = await fetch(url);
        Fun.wasm_source = await globalThis.WebAssembly.instantiate(await resp.arrayBuffer(), {
          env: env,
          wasi_snapshot_preview1: Wasi,
        });
        // is it node?
      }
    } else {
      const fs = await import("fs");

      if (typeof url === "string" && url.startsWith("file://")) {
        url = new URL(url); // fs.readFileSync cannot consume URL strings, only URL objects
      }

      Fun.wasm_source = await globalThis.WebAssembly.instantiate(fs.readFileSync(url), {
        env: env,
        wasi_snapshot_preview1: Wasi,
      });
    }

    const res = Fun.wasm_exports.init(heapSize);

    if (res < 0) {
      throw new Error(`[Fun] Failed to initialize WASM module: code ${res}`);
    }

    Fun.has_initialized = true;
  }

  static getTests(content: Uint8Array, filename = "my.test.tsx") {
    const bb = new ByteBuffer(Fun.scratch);
    bb.length = 0;
    bb.index = 0;
    const contents_buffer = content;

    encodeGetTestsRequest(
      {
        contents: contents_buffer,
        path: filename,
      },
      bb,
    );

    const data = bb.toUint8Array();

    const input_ptr = Fun.wasm_exports.fun_malloc(data.length);
    var buffer = Fun._wasmPtrToSlice(input_ptr);
    buffer.set(data);
    captureErrors = true;
    try {
      var resp_ptr = Fun.wasm_exports.getTests(input_ptr);
    } catch (e) {
      throw e;
    } finally {
      captureErrors = false;
      Fun.wasm_exports.fun_free(input_ptr);
    }

    if (Number(resp_ptr) === 0) {
      if (capturedErrors.length) {
        const err = capturedErrors.slice();
        capturedErrors.length = 0;
        throw new Error(err.join("\n").trim());
      }

      throw new Error("Failed to parse");
    }

    if (capturedErrors.length) {
      Fun.wasm_exports.fun_free(resp_ptr);
      const err = capturedErrors.slice();
      capturedErrors.length = 0;
      throw new Error(err.join("\n").trim());
    }

    var _bb = new ByteBuffer(Fun._wasmPtrToSlice(resp_ptr));

    const response = decodeGetTestsResponse(_bb);
    var tests: TestReference[] = new Array(response.tests.length);

    for (var i = 0; i < response.tests.length; i++) {
      tests[i] = {
        name: new TextDecoder().decode(
          response.contents.subarray(
            response.tests[i].label.offset,
            response.tests[i].label.offset + response.tests[i].label.length,
          ),
        ),
        byteOffset: response.tests[i].byteOffset,
        kind: testKindMap[response.tests[i].kind] as "test" | "describe",
      };
    }

    Fun.wasm_exports.fun_free(resp_ptr);

    return tests;
  }

  static transformSync(
    content: Uint8Array | string,
    file_name: string,
    loader?: keyof typeof Loader,
  ): TransformResponse {
    const bb = new ByteBuffer(Fun.scratch);
    bb.length = 0;
    bb.index = 0;
    var contents_buffer;
    if (typeof content === "string") {
      contents_buffer = Fun._encoder.encode(content);
    } else {
      contents_buffer = content;
    }
    encodeTransform(
      {
        contents: contents_buffer,
        path: file_name,
        loader: normalizeLoader(file_name, loader),
      },
      bb,
    );
    const data = bb.toUint8Array();

    const input_ptr = Fun.wasm_exports.fun_malloc(data.length);
    var buffer = Fun._wasmPtrToSlice(input_ptr);
    buffer.set(data);

    const resp_ptr = Fun.wasm_exports.transform(input_ptr);
    var _bb = new ByteBuffer(Fun._wasmPtrToSlice(resp_ptr));
    const response = decodeTransformResponse(_bb);
    Fun.wasm_exports.fun_free(input_ptr);
    Fun.scratch = bb.data;
    return response;
  }

  static scan(content: Uint8Array | string, file_name: string, loader?: keyof typeof Loader): ScanResult {
    const bb = new ByteBuffer(Fun.scratch);
    bb.length = 0;
    bb.index = 0;
    var contents_buffer;
    if (typeof content === "string") {
      contents_buffer = Fun._encoder.encode(content);
    } else {
      contents_buffer = content;
    }

    encodeScan(
      {
        contents: contents_buffer,
        path: file_name,
        loader: normalizeLoader(file_name, loader),
      },
      bb,
    );
    const data = bb.toUint8Array();

    const input_ptr = Fun.wasm_exports.fun_malloc(data.length);
    var buffer = Fun._wasmPtrToSlice(input_ptr);
    buffer.set(data);

    const resp_ptr = Fun.wasm_exports.scan(input_ptr);
    var _bb = new ByteBuffer(Fun._wasmPtrToSlice(resp_ptr));
    //console.log(resp_ptr, Fun.ptr_slice[0], Fun.ptr_slice[1], new Uint8Array(Fun.memory.buffer, Fun.ptr_slice[0], Fun.ptr_slice[1] + 82));
    //console.log(_bb);
    const response = decodeScanResult(_bb);
    Fun.wasm_exports.fun_free(input_ptr);
    Fun.scratch = bb.data;
    return response;
  }
}

export const transformSync = Fun.transformSync;
export const scan = Fun.scan;
export const init = Fun.init;
export const getTests = Fun.getTests;
export default Fun;
