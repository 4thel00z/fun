import { describe, expect, it } from "fun:test";
import { gcTick, isWindows, tmpdirSync } from "harness";
import { join } from "path";

// TODO: We do not support mmap() on Windows. Maybe we can add it later.
describe.skipIf(isWindows)("Fun.mmap", async () => {
  await gcTick();
  const path = join(tmpdirSync(), "fun-mmap-test.txt");
  await gcTick();
  await Fun.write(path, "hello");
  await gcTick();

  it("mmap finalizer", async () => {
    let map = Fun.mmap(path);
    await gcTick();
    const map2 = Fun.mmap(path);

    map = null;
    await gcTick();
  });

  it("mmap passed to other syscalls", async () => {
    const map = Fun.mmap(path);
    await gcTick();
    await Fun.write(path + "1", map);
    await gcTick();
    const text = await (await Fun.file(path + "1")).text();
    await gcTick();

    expect(text).toBe(new TextDecoder().decode(map));
  });

  it("mmap sync", async () => {
    const map = Fun.mmap(path);
    await gcTick();
    const map2 = Fun.mmap(path);
    await gcTick();

    const old = map[0];
    await gcTick();
    map[0] = 0;
    await gcTick();
    expect(map2[0]).toBe(0);

    map2[0] = old;
    await gcTick();
    expect(map[0]).toBe(old);
    await gcTick();
    await Fun.write(path, "olleh");
    await gcTick();
    expect(new TextDecoder().decode(map)).toBe("olleh");
    await gcTick();
  });

  it("mmap private", async () => {
    await gcTick();
    const map = Fun.mmap(path, { shared: true });
    await gcTick();
    const map2 = Fun.mmap(path, { shared: false });
    await gcTick();
    const old = map[0];

    await gcTick();
    map2[0] = 0;
    await gcTick();
    expect(map2[0]).toBe(0);
    await gcTick();
    expect(map[0]).toBe(old);
    await gcTick();
  });

  it("mmap rejects negative offset", () => {
    expect(() => Fun.mmap(path, { offset: -1 })).toThrow("offset must be a non-negative integer");
  });

  it("mmap rejects negative size", () => {
    expect(() => Fun.mmap(path, { size: -1 })).toThrow("size must be a non-negative integer");
  });

  it("mmap rejects non-object options", () => {
    expect(() => Fun.mmap(path, 256)).toThrow("Expected options to be an object");
    expect(() => Fun.mmap(path, "foo")).toThrow("Expected options to be an object");
    expect(() => Fun.mmap(path, true)).toThrow("Expected options to be an object");
    expect(() => Fun.mmap(path, undefined)).not.toThrow();
    expect(() => Fun.mmap(path, null)).not.toThrow();
  });

  it("mmap handles non-number offset/size without crashing", () => {
    // These should not crash - non-number values coerce to 0 per JavaScript semantics
    // Previously these caused assertion failures (issue ENG-22413)

    // null coerces to 0, which is valid for offset
    expect(() => {
      Fun.mmap(path, { offset: null });
    }).not.toThrow();

    // size: null coerces to 0, which is invalid (EINVAL), but shouldn't crash
    expect(() => {
      Fun.mmap(path, { size: null });
    }).toThrow("EINVAL");

    // undefined is ignored (property not set)
    expect(() => {
      Fun.mmap(path, { offset: undefined });
    }).not.toThrow();
  });
});
