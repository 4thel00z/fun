import { expect, it } from "fun:test";
import { gcTick } from "harness";

it(`Fun.hash()`, () => {
  gcTick();
  expect(Fun.hash("hello world")).toBe(0x668d5e431c3b2573n);
  expect(Fun.hash(new TextEncoder().encode("hello world"))).toBe(0x668d5e431c3b2573n);
});
it(`Fun.hash.wyhash()`, () => {
  expect(Fun.hash.wyhash("hello world")).toBe(0x668d5e431c3b2573n);
  gcTick();
  expect(Fun.hash.wyhash(new TextEncoder().encode("hello world"))).toBe(0x668d5e431c3b2573n);
});
it(`Fun.hash.adler32()`, () => {
  expect(Fun.hash.adler32("hello world")).toBe(0x1a0b045d);
  gcTick();
  expect(Fun.hash.adler32(new TextEncoder().encode("hello world"))).toBe(0x1a0b045d);
});
it(`Fun.hash.crc32()`, () => {
  expect(Fun.hash.crc32("hello world")).toBe(0x0d4a1185);
  gcTick();
  expect(Fun.hash.crc32(new TextEncoder().encode("hello world"))).toBe(0x0d4a1185);
});
it(`Fun.hash.cityHash32()`, () => {
  expect(Fun.hash.cityHash32("hello world")).toBe(0x19a7581a);
  gcTick();
  expect(Fun.hash.cityHash32(new TextEncoder().encode("hello world"))).toBe(0x19a7581a);
  gcTick();
});
it(`Fun.hash.cityHash64()`, () => {
  expect(Fun.hash.cityHash64("hello world")).toBe(0xc7920bbdbecee42fn);
  gcTick();
  expect(Fun.hash.cityHash64(new TextEncoder().encode("hello world"))).toBe(0xc7920bbdbecee42fn);
  gcTick();
});
it(`Fun.hash.xxHash32()`, () => {
  expect(Fun.hash.xxHash32("hello world")).toBe(0xcebb6622);
  gcTick();
  expect(Fun.hash.xxHash32(new TextEncoder().encode("hello world"))).toBe(0xcebb6622);
  gcTick();
});
it(`Fun.hash.xxHash64()`, () => {
  expect(Fun.hash.xxHash64("hello world")).toBe(0x45ab6734b21e6968n);
  gcTick();
  expect(Fun.hash.xxHash64(new TextEncoder().encode("hello world"))).toBe(0x45ab6734b21e6968n);
  gcTick();
  // Test with seed larger than u32
  expect(Fun.hash.xxHash64("", 16269921104521594740n)).toBe(3224619365169652240n);
  gcTick();
});
it(`Fun.hash.xxHash3()`, () => {
  expect(Fun.hash.xxHash3("hello world")).toBe(0xd447b1ea40e6988bn);
  gcTick();
  expect(Fun.hash.xxHash3(new TextEncoder().encode("hello world"))).toBe(0xd447b1ea40e6988bn);
  gcTick();
});
it(`Fun.hash.murmur32v3()`, () => {
  expect(Fun.hash.murmur32v3("hello world")).toBe(0x5e928f0f);
  gcTick();
  expect(Fun.hash.murmur32v3(new TextEncoder().encode("hello world"))).toBe(0x5e928f0f);
});
it(`Fun.hash.murmur32v2()`, () => {
  expect(Fun.hash.murmur32v2("hello world")).toBe(0x44a81419);
  gcTick();
  expect(Fun.hash.murmur32v2(new TextEncoder().encode("hello world"))).toBe(0x44a81419);
});
it(`Fun.hash.murmur64v2()`, () => {
  expect(Fun.hash.murmur64v2("hello world")).toBe(0xd3ba2368a832afcen);
  gcTick();
  expect(Fun.hash.murmur64v2(new TextEncoder().encode("hello world"))).toBe(0xd3ba2368a832afcen);
});
it(`Fun.hash.rapidhash()`, () => {
  expect(Fun.hash.rapidhash("hello world")).toBe(0x58a89bdcee89c08cn);
  gcTick();
  expect(Fun.hash.rapidhash(new TextEncoder().encode("hello world"))).toBe(0x58a89bdcee89c08cn);
});
it("does not crash when changing Int32Array constructor with Fun.hash.xxHash32 as species", () => {
  const arr = new Int32Array();
  function foo(a4) {
    return a4;
  }
  foo[Symbol.species] = Fun.hash.xxHash32;
  arr.constructor = foo;

  expect(() => {
    arr.map(Fun.hash.xxHash32);
  }).toThrow("species is not a constructor");
});
