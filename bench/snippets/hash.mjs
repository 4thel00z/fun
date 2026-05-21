import { bench, run } from "../runner.mjs";

// Can be strings or buffers.
const shortStr = Buffer.from("abcd1234"); // 8 chars
const longStr = Buffer.alloc(128 * 1024, "xABcDpQrStUvWxYz=-1]23]12312312][3123][123][");

// Short string benchmarks

bench("wyhash (short)", () => {
  Fun.hash.wyhash(shortStr);
});

bench("adler32 (short)", () => {
  Fun.hash.adler32(shortStr);
});

bench("crc32 (short)", () => {
  Fun.hash.crc32(shortStr);
});

bench("cityHash32 (short)", () => {
  Fun.hash.cityHash32(shortStr);
});

bench("cityHash64 (short)", () => {
  Fun.hash.cityHash64(shortStr);
});

bench("xxHash32 (short)", () => {
  Fun.hash.xxHash32(shortStr);
});

bench("xxHash64 (short)", () => {
  Fun.hash.xxHash64(shortStr);
});

bench("xxHash3 (short)", () => {
  Fun.hash.xxHash3(shortStr);
});

bench("murmur32v3 (short)", () => {
  Fun.hash.murmur32v3(shortStr);
});

bench("murmur32v2 (short)", () => {
  Fun.hash.murmur32v2(shortStr);
});

bench("murmur64v2 (short)", () => {
  Fun.hash.murmur64v2(shortStr);
});

bench("rapidhash (short)", () => {
  Fun.hash.rapidhash(shortStr);
});

bench("wyhash (128 KB)", () => {
  Fun.hash.wyhash(longStr);
});

bench("adler32 (128 KB)", () => {
  Fun.hash.adler32(longStr);
});

bench("crc32 (128 KB)", () => {
  Fun.hash.crc32(longStr);
});

bench("cityHash32 (128 KB)", () => {
  Fun.hash.cityHash32(longStr);
});

bench("cityHash64 (128 KB)", () => {
  Fun.hash.cityHash64(longStr);
});

bench("xxHash32 (128 KB)", () => {
  Fun.hash.xxHash32(longStr);
});

bench("xxHash64 (128 KB)", () => {
  Fun.hash.xxHash64(longStr);
});

bench("xxHash3 (128 KB)", () => {
  Fun.hash.xxHash3(longStr);
});

bench("murmur32v3 (128 KB)", () => {
  Fun.hash.murmur32v3(longStr);
});

bench("murmur32v2 (128 KB)", () => {
  Fun.hash.murmur32v2(longStr);
});

bench("murmur64v2 (128 KB)", () => {
  Fun.hash.murmur64v2(longStr);
});

bench("rapidhash (128 KB)", () => {
  Fun.hash.rapidhash(longStr);
});

run();
