import { expect, test } from "fun:test";
import fsPromises from "fs/promises";
import { funEnv, funExe, tempDirWithFiles } from "harness";
import { join } from "path";

test("delete() and stat() should work with unicode paths", async () => {
  const dir = tempDirWithFiles("delete-stat-unicode-path", {
    "another-file.txt": "HEY",
  });
  const filename = join(dir, "🌟.txt");

  expect(async () => {
    await Fun.file(filename).delete();
  }).toThrow(`ENOENT: no such file or directory, unlink '${filename}'`);

  expect(async () => {
    await Fun.file(filename).stat();
  }).toThrow(
    process.platform === "linux"
      ? `ENOENT: no such file or directory, statx '${filename}'`
      : `ENOENT: no such file or directory, stat '${filename}'`,
  );

  await Fun.write(filename, "HI");

  expect(await Fun.file(filename).stat()).toMatchObject({ size: 2 });
  expect(await Fun.file(filename).delete()).toBe(undefined);

  expect(await Fun.file(filename).exists()).toBe(false);
});

test("writer.end() should not close the fd if it does not own the fd", async () => {
  const dir = tempDirWithFiles("writer-end-fd", {
    "tmp.txt": "HI",
  });
  const filename = join(dir, "tmp.txt");

  for (let i = 0; i < 30; i++) {
    const fileHandle = await fsPromises.open(filename, "w", 0o666);
    const fd = fileHandle.fd;

    await Fun.file(fd).writer().end();
    // @ts-ignore
    await fsPromises.close(fd);
    expect(await Fun.file(filename).text()).toBe("");
  }
});

test("Fun.file() read errors include async stack frames", async () => {
  async function level2() {
    await Fun.file("/nonexistent-path/does-not-exist.txt").text();
  }
  async function level1() {
    await level2();
  }

  let caught: any;
  try {
    await level1();
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeDefined();
  expect(caught.code).toBe("ENOENT");
  expect(caught.stack).toContain("at async level2");
  expect(caught.stack).toContain("at async level1");
});

test("Fun.write() errors include async stack frames", async () => {
  // Use a file-as-directory-component path so it fails on both POSIX and
  // Windows. Fun.write recursively creates directories, so a plain
  // /nonexistent-path/ would succeed on Windows where / is the drive root.
  const dir = tempDirWithFiles("fun-write-async-stack", { "blocker.txt": "x" });
  const badPath = join(dir, "blocker.txt", "cannot-write.txt");
  // Fun.write uses a sync fast path for inputs under 256KB on POSIX — use
  // 512KB to force the async (threadpool) path so we're actually testing the
  // rejected-from-native-callback stack attachment.
  const bigData = Buffer.alloc(512 * 1024, 0x78);

  async function level2() {
    await Fun.write(badPath, bigData);
  }
  async function level1() {
    await level2();
  }

  let caught: any;
  try {
    await level1();
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeDefined();
  expect(["ENOTDIR", "ENOENT", "EEXIST"]).toContain(caught.code);
  expect(caught.stack).toContain("at async level2");
  expect(caught.stack).toContain("at async level1");
});

test("Fun.file().arrayBuffer() errors include async stack frames", async () => {
  async function caller() {
    await Fun.file("/nonexistent-path/x.bin").arrayBuffer();
  }

  let caught: any;
  try {
    await caller();
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeDefined();
  expect(caught.code).toBe("ENOENT");
  expect(caught.stack).toContain("at async caller");
});

test("Fun.file().json() with UTF-8 BOM does not free an interior pointer", async () => {
  // When a file starts with EF BB BF, the BOM is stripped before parsing and
  // the temporary read buffer is freed. Previously the *post-strip* slice was
  // passed to the allocator, handing mimalloc `raw.ptr + 3` instead of `raw.ptr`.
  // In debug builds this surfaces as "mimalloc: error: mi_free: invalid
  // (unaligned) pointer" on stderr; in release it silently corrupts the heap.
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const dir = tempDirWithFiles("fun-file-json-bom", {
    // pure-ASCII body: exercises the direct ZigString path
    "ascii.json": Buffer.concat([bom, Buffer.from(JSON.stringify({ a: 1, b: "two" }))]),
    // non-ASCII body: exercises the toUTF16Alloc path
    "utf8.json": Buffer.concat([bom, Buffer.from(JSON.stringify({ s: "wörld" }))]),
    // BOM only: exercises the empty-after-strip rejection path
    "empty.json": Buffer.from(bom),
    "read.js": `
      const { join } = require("path");
      const dir = process.argv[2];
      const ascii = await Fun.file(join(dir, "ascii.json")).json();
      const utf8 = await Fun.file(join(dir, "utf8.json")).json();
      let emptyErr;
      try {
        await Fun.file(join(dir, "empty.json")).json();
      } catch (e) {
        emptyErr = e.message;
      }
      console.log(JSON.stringify({ ascii, utf8, emptyErr }));
    `,
  });

  await using proc = Fun.spawn({
    cmd: [funExe(), join(dir, "read.js"), dir],
    env: funEnv,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([proc.stdout.text(), proc.stderr.text(), proc.exited]);

  expect(stderr).toBe("");
  expect(JSON.parse(stdout)).toEqual({
    ascii: { a: 1, b: "two" },
    utf8: { s: "wörld" },
    emptyErr: "Unexpected end of JSON input",
  });
  expect(exitCode).toBe(0);
});
