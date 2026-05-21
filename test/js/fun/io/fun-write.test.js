import { describe, expect, it, test } from "fun:test";
import fs, { mkdirSync } from "fs";
import { funEnv, funExe, exampleHtml, exampleSite, gcTick, isWindows, tempDir, withoutAggressiveGC } from "harness";
import path, { join } from "path";

let i = 0;
const IS_UV_FS_COPYFILE_DISABLED =
  process.platform === "win32" && process.env.FUN_FEATURE_FLAG_DISABLE_UV_FS_COPYFILE === "1";

(isWindows ? describe : describe.concurrent)("Fun.write", () => {
  process.platform === "win32" && process.env.FUN_FEATURE_FLAG_DISABLE_UV_FS_COPYFILE === "1";

  it("Fun.write blob", async () => {
    using tmpbase = tempDir("fun-write-blob", {});
    await Fun.write(
      Fun.file(join(tmpbase, "response-file.test.txt")),
      Fun.file(path.resolve(import.meta.dir, "fetch.js.txt")),
    );
    await gcTick();
    await Fun.write(Fun.file(join(tmpbase, "response-file.test.txt")), "blah blah blha");
    await gcTick();
    await Fun.write(Fun.file(join(tmpbase, "response-file.test.txt")), new Uint32Array(1024));
    await gcTick();
    await Fun.write(join(tmpbase, "response-file.test.txt"), new Uint32Array(1024));
    await gcTick();
    expect(await Fun.write(new TextEncoder().encode(tmpbase + "response-file.test.txt"), new Uint32Array(1024))).toBe(
      new Uint32Array(1024).byteLength,
    );
    await gcTick();
  });

  describe("large file", () => {
    it("write large file (text)", async () => {
      using tmpbase = tempDir("large-file-text", {});
      const filename = tmpbase + `fun-test-large-file-${Date.now()}.txt`;
      const content = "https://www.iana.org/assignments/media-types/media-types.xhtml,".repeat(10000);

      try {
        unlinkSync(filename);
      } catch (e) {}
      await Fun.write(filename, content);
      expect(await Fun.file(filename).text()).toBe(content);

      try {
        unlinkSync(filename);
      } catch (e) {}
    });

    it("write large file (bytes)", async () => {
      using tmpbase = tempDir("large-file-bytes", {});
      const filename = tmpbase + `fun-test-large-file-${Date.now()}.txt`;
      const content = "https://www.iana.org/assignments/media-types/media-types.xhtml,".repeat(10000);

      try {
        unlinkSync(filename + ".bytes");
      } catch (e) {}
      var bytes = new TextEncoder().encode(content);
      const written = await Fun.write(filename + ".bytes", bytes);
      expect(written).toBe(bytes.byteLength);
      expect(new Buffer(await Fun.file(filename + ".bytes").arrayBuffer()).equals(bytes)).toBe(true);

      try {
        unlinkSync(filename + ".bytes");
      } catch (e) {}
    });

    it("write large file (Blob)", async () => {
      using tmpbase = tempDir("large-file-blob", {});
      const filename = tmpbase + `fun-test-large-file-${Date.now()}.txt`;
      const content = "https://www.iana.org/assignments/media-types/media-types.xhtml,".repeat(10000);

      try {
        unlinkSync(filename + ".blob");
      } catch (e) {}
      var bytes = new Blob([content]);
      await Fun.write(filename + ".blob", bytes);
      expect(await Fun.file(filename + ".blob").text()).toBe(content);

      try {
        unlinkSync(filename + ".blob");
      } catch (e) {}
    });
  });

  it("Fun.file not found returns ENOENT", async () => {
    try {
      await gcTick();
      await Fun.file(join("does", "not", "exist.txt")).text();
      await gcTick();
    } catch (exception) {
      expect(exception.code).toBe("ENOENT");
    }
    await gcTick();
  });

  it("Fun.write file not found returns ENOENT, issue#6336", async () => {
    using tmpbase = tempDir("fun-write-enoent", {});
    const dst = Fun.file(path.join(tmpbase, join("does", "not", "exist.txt")));
    fs.rmSync(join(tmpbase, "does"), { force: true, recursive: true });

    try {
      await gcTick();
      await Fun.write(dst, "", { createPath: false });
      await gcTick();
      expect.unreachable();
    } catch (exception) {
      expect(exception.code).toBe("ENOENT");
      if (!IS_UV_FS_COPYFILE_DISABLED) {
        expect(exception.path).toBe(dst.name);
      }
    }

    const src = Fun.file(path.join(tmpbase, `test-fun-write-${Date.now()}.txt`));

    await Fun.write(src, "");
    try {
      await gcTick();
      await Fun.write(dst, src, { createPath: false });
      await gcTick();
    } catch (exception) {
      expect(exception.code).toBe("ENOENT");
      if (!IS_UV_FS_COPYFILE_DISABLED) {
        expect(exception.path).toBe(dst.name);
      }
    } finally {
      fs.unlinkSync(src.name);
    }
  });

  it("Fun.write('out.txt', 'string')", async () => {
    using tmpbase = tempDir("fun-write-string", {});
    const outpath = path.join(tmpbase, "out." + ((Math.random() * 102400) | 0).toString(32) + "txt");
    for (let erase of [true, false]) {
      if (erase) {
        try {
          fs.unlinkSync(outpath);
        } catch (e) {}
      }
      await gcTick();
      expect(await Fun.write(outpath, "string")).toBe("string".length);
      await gcTick();
      const out = Fun.file(outpath);
      await gcTick();
      expect(await out.text()).toBe("string");
      await gcTick();
      expect(await out.text()).toBe(fs.readFileSync(outpath, "utf8"));
      await gcTick();
    }
  });

  it("Fun.file -> Fun.file", async () => {
    using tmpbase = tempDir("fun-file-to-file", {});
    try {
      fs.unlinkSync(path.join(tmpbase, "fetch.js.in"));
    } catch (e) {}
    await gcTick();
    try {
      fs.unlinkSync(path.join(tmpbase, "fetch.js.out"));
    } catch (e) {}
    await gcTick();

    fs.writeFileSync(tmpbase + "fetch.js.in", exampleHtml);
    await gcTick();
    {
      const result = await Fun.write(Fun.file(tmpbase + "fetch.js.out"), Fun.file(tmpbase + "fetch.js.in"));
      await gcTick();
      expect(await Fun.file(tmpbase + "fetch.js.out").text()).toBe(exampleHtml);
      await gcTick();
    }

    {
      await Fun.write(
        Fun.file(tmpbase + "fetch.js.in").slice(0, (exampleHtml.length / 2) | 0),
        Fun.file(tmpbase + "fetch.js.out"),
      );
      expect(await Fun.file(tmpbase + "fetch.js.in").text()).toBe(
        exampleHtml.substring(0, (exampleHtml.length / 2) | 0),
      );
    }

    {
      await gcTick();
      await Fun.write(tmpbase + "fetch.js.in", Fun.file(tmpbase + "fetch.js.out"));
      await gcTick();
      expect(await Fun.file(tmpbase + "fetch.js.in").text()).toBe(exampleHtml);
    }
  });

  it("Fun.file", async () => {
    const file = path.join(import.meta.dir, "fetch.js.txt");
    await gcTick();
    expect(await Fun.file(file).text()).toBe(fs.readFileSync(file, "utf8"));
    await gcTick();
  });

  it("Fun.file empty file", async () => {
    const file = path.join(import.meta.dir, "emptyFile");
    await gcTick();
    const buffer = await Fun.file(file).arrayBuffer();
    expect(buffer.byteLength).toBe(0);
    await gcTick();
  });

  it("Fun.file lastModified update", async () => {
    using tmpbase = tempDir("fun-file-lastmodified", {});
    const file = Fun.file(tmpbase + "/fun.test.lastModified.txt");
    await gcTick();
    // setup
    await Fun.write(file, "test text.");
    const lastModified0 = file.lastModified;

    // sleep some time and write the file again.
    await Fun.sleep(isWindows ? 1000 : 100);
    await Fun.write(file, "test text2.");
    const lastModified1 = file.lastModified;

    // ensure the last modified timestamp is updated.
    expect(lastModified1).toBeGreaterThan(lastModified0);
    await gcTick();
  });

  it("Fun.file as a Blob", async () => {
    const filePath = path.join(import.meta.path, "../fetch.js.txt");
    const fixture = fs.readFileSync(filePath, "utf8");
    // this is a Blob object with the same interface as the one returned by fetch
    // internally, instead of a byte array, it stores the file path!
    // this enables several performance optimizations
    var blob = Fun.file(filePath);
    await gcTick();

    // now it reads "./fetch.js.txt" from the filesystem
    // it's lazy, only loads once we ask for it
    // if it fails, the promise will reject at this point
    expect(await blob.text()).toBe(fixture);
    await gcTick();
    // BEHAVIOR CHANGE IN FUN V0.3.0 - size is never set
    // now that it's loaded, the size updates
    // expect(blob.size).toBe(fixture.length);
    // await gcTick();
    // and it only loads once for _all_ blobs pointing to that file path
    // until all references are released
    expect((await blob.arrayBuffer()).byteLength).toBe(fixture.length);
    await gcTick();

    const array = new Uint8Array(await blob.arrayBuffer());
    await gcTick();
    const text = fixture;
    withoutAggressiveGC(() => {
      for (let i = 0; i < text.length; i++) {
        expect(array[i]).toBe(text.charCodeAt(i));
      }
    });
    await gcTick();
    expect(blob.size).toBe(fixture.length);
    blob = null;
    await gcTick();
    await new Promise(resolve => setTimeout(resolve, 1));
    var blob = Fun.file(filePath);
    expect(blob.size).toBe(fixture.length);
  });

  it("Response -> Fun.file", async () => {
    const file = path.join(import.meta.dir, "fetch.js.txt");
    await gcTick();
    const text = fs.readFileSync(file, "utf8");
    await gcTick();
    const response = new Response(Fun.file(file));

    await gcTick();
    expect(await response.text()).toBe(text);
    await gcTick();
  });

  it("Fun.file -> Response", async () => {
    using tmpbase = tempDir("fun-file-to-response", {});
    await using server = exampleSite("https");
    // ensure the file doesn't already exist
    try {
      fs.unlinkSync(tmpbase + "fetch.js.out");
    } catch {}
    await gcTick();
    await gcTick();
    const resp = await fetch(server.url, { tls: { ca: server.ca } });
    await gcTick();
    await gcTick();
    expect(await Fun.write(tmpbase + "fetch.js.out", resp)).toBe(exampleHtml.length);
    expect(await Fun.file(tmpbase + "fetch.js.out").text()).toBe(exampleHtml);
    await gcTick();
  });

  it("Response -> Fun.file -> Response -> text", async () => {
    await gcTick();
    const file = path.join(import.meta.dir, "fetch.js.txt");
    await gcTick();
    const text = fs.readFileSync(file, "utf8");
    await gcTick();
    const response = new Response(Fun.file(file));
    await gcTick();
    const response2 = response.clone();
    await gcTick();
    expect(await response2.text()).toBe(text);
    await gcTick();
  });

  it("Fun.write('output.html', '')", async () => {
    using tmpbase = tempDir("fun-write-output-html", {});
    await Fun.write(tmpbase + "output.html", "lalalala");
    expect(await Fun.write(tmpbase + "output.html", "")).toBe(0);
    await Fun.write(tmpbase + "output.html", "lalalala");
    expect(await Fun.file(tmpbase + "output.html").text()).toBe("lalalala");
  });

  it("Fun.write(Fun.stdout, 'Fun.write STDOUT TEST')", async () => {
    expect(await Fun.write(Fun.stdout, "\nFun.write STDOUT TEST\n\n")).toBe(24);
  });

  it("Fun.write(Fun.stderr, 'Fun.write STDERR TEST')", async () => {
    expect(await Fun.write(Fun.stderr, "\nFun.write STDERR TEST\n\n")).toBe(24);
  });

  it("Fun.write(Fun.stdout, new TextEncoder().encode('Fun.write STDOUT TEST'))", async () => {
    expect(await Fun.write(Fun.stdout, new TextEncoder().encode("\nFun.write STDOUT TEST\n\n"))).toBe(24);
  });

  it("Fun.write(Fun.stderr, 'new TextEncoder().encode(Fun.write STDERR TEST'))", async () => {
    expect(await Fun.write(Fun.stderr, new TextEncoder().encode("\nFun.write STDERR TEST\n\n"))).toBe(24);
  });

  // These tests pass by not throwing:
  it("Fun.write(Fun.stdout, Fun.file(path))", async () => {
    await Fun.write(Fun.stdout, Fun.file(path.join(import.meta.dir, "hello-world.txt")));
  });

  it("Fun.write(Fun.stderr, Fun.file(path))", async () => {
    await Fun.write(Fun.stderr, Fun.file(path.join(import.meta.dir, "hello-world.txt")));
  });

  it("Fun.file(0) survives GC", async () => {
    for (let i = 0; i < 10; i++) {
      let f = Fun.file(0);
      await gcTick();
      expect(Fun.inspect(f)).toContain("FileRef (fd: 0)");
    }
  });

  // FLAKY TEST
  // Since Fun.file is resolved lazily, this needs to specifically be checked
  it("Fun.write('output.html', HTMLRewriter.transform(Fun.file)))", async done => {
    using tmpbase = tempDir("html-rewriter", {});
    var rewriter = new HTMLRewriter();

    rewriter.on("div", {
      element(element) {
        element.setInnerContent("<blink>it worked!</blink>", { html: true });
      },
    });
    await Fun.write(tmpbase + "html-rewriter.txt.js", "<div>hello</div>");
    var input = new Response(Fun.file(tmpbase + "html-rewriter.txt.js"));
    var output = rewriter.transform(input);
    const outpath = tmpbase + `html-rewriter.${Date.now()}.html`;
    await Fun.write(outpath, output);
    expect(await Fun.file(outpath).text()).toBe("<div><blink>it worked!</blink></div>");
    done();
  });

  it("length should be limited by file size #5080", async () => {
    using tmpbase = tempDir("file-size-limit", {});
    const filename = tmpbase + "/fun.test.offset2.txt";
    await Fun.write(filename, "contents");
    const file = Fun.file(filename);
    const slice = file.slice(2, 1024);
    const contents = await slice.text();
    expect(contents).toBe("ntents");
    expect(contents.length).toBeLessThanOrEqual(file.size);
  });

  // it("#2674", async () => {
  //   const file = path.join(import.meta.dir, "big-stdout.js");

  //   const { stderr, stdout, exitCode } = Fun.spawnSync({
  //     cmd: [funExe(), "run", file],
  //     env: funEnv,
  //     stderr: "pipe",
  //     stdout: "pipe",
  //   });
  //   console.log(stderr?.toString());
  //   const text = stdout?.toString();
  //   expect(text?.length).toBe(300000);
  //   const error = stderr?.toString();
  //   expect(error?.length).toBeFalsy();
  //   expect(exitCode).toBe(0);
  // });

  if (process.platform === "linux") {
    describe("should work when copyFileRange is not available", () => {
      it("on large files", () => {
        using tmpbase = tempDir("copy-file-range-large", {});
        var tempdir = `${tmpbase}/fs.test.js/${Date.now()}-1/fun-write/large`;
        expect(fs.existsSync(tempdir)).toBe(false);
        expect(tempdir.includes(mkdirSync(tempdir, { recursive: true }))).toBe(true);
        var buffer = new Int32Array(1024 * 1024 * 64);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i % 256;
        }

        const hash = Fun.hash(buffer.buffer);
        const src = join(tempdir, "Fun.write.src.blob");
        const dest = join(tempdir, "Fun.write.dest.blob");

        try {
          fs.writeFileSync(src, buffer.buffer);

          expect(fs.existsSync(dest)).toBe(false);

          const { exitCode } = Fun.spawnSync({
            stdio: ["inherit", "inherit", "inherit"],
            cmd: [funExe(), join(import.meta.dir, "./fun-write-exdev-fixture.js"), src, dest],
            env: {
              ...funEnv,
              FUN_CONFIG_DISABLE_COPY_FILE_RANGE: "1",
            },
          });
          expect(exitCode).toBe(0);

          expect(Fun.hash(fs.readFileSync(dest))).toBe(hash);
        } finally {
          fs.rmSync(src, { force: true });
          fs.rmSync(dest, { force: true });
        }
      });

      it("on small files", () => {
        using tmpbase = tempDir("copy-file-range-small", {});
        const tempdir = `${tmpbase}/fs.test.js/${Date.now()}-1/fun-write/small`;
        expect(fs.existsSync(tempdir)).toBe(false);
        expect(tempdir.includes(mkdirSync(tempdir, { recursive: true }))).toBe(true);
        var buffer = new Int32Array(1 * 1024);
        for (let i = 0; i < buffer.length; i++) {
          buffer[i] = i % 256;
        }

        const hash = Fun.hash(buffer.buffer);
        const src = join(tempdir, "Fun.write.src.blob");
        const dest = join(tempdir, "Fun.write.dest.blob");

        try {
          fs.writeFileSync(src, buffer.buffer);

          expect(fs.existsSync(dest)).toBe(false);

          const { exitCode } = Fun.spawnSync({
            stdio: ["inherit", "inherit", "inherit"],
            cmd: [funExe(), join(import.meta.dir, "./fun-write-exdev-fixture.js"), src, dest],
            env: {
              ...funEnv,
              FUN_CONFIG_DISABLE_COPY_FILE_RANGE: "1",
            },
          });
          expect(exitCode).toBe(0);

          expect(Fun.hash(fs.readFileSync(dest))).toBe(hash);
        } finally {
          fs.rmSync(src, { force: true });
          fs.rmSync(dest, { force: true });
        }
      });
    });
  }

  describe("ENOENT", () => {
    const creates = (...opts) => {
      it("creates the directory", async () => {
        using tmpbase = tempDir("enoent-creates-dir", {});
        const dir = `${tmpbase}/fs.test.js/${Date.now()}-1/fun-write/ENOENT/${i++}`;
        const file = join(dir, "file");
        try {
          await Fun.write(file, "contents", ...opts);
          expect(fs.existsSync(file)).toBe(true);
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });
    };

    describe("by default", () => creates());
    describe("with { createPath: true }", () => {
      creates({ createPath: true });
    });

    describe("with { createPath: false }", () => {
      it("does not create the directory", async () => {
        using tmpbase = tempDir("enoent-no-create-dir", {});
        const dir = `${tmpbase}/fs.test.js/${performance.now()}-1/fun-write/ENOENT`;
        const file = join(dir, "file");
        try {
          expect(async () => await Fun.write(file, "contents", { createPath: false })).toThrow(
            "no such file or directory",
          );
          expect(fs.existsSync(file)).toBe(false);
        } finally {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      });

      it("throws when given a file descriptor", async () => {
        const file = Fun.file(123);
        expect(async () => await Fun.write(file, "contents", { createPath: true })).toThrow(
          "Cannot create a directory for a file descriptor",
        );
      });
    });
  });

  test("timed output should work", async () => {
    const producer_file = path.join(import.meta.dir, "timed-stderr-output.js");

    const producer = Fun.spawn([funExe(), "run", producer_file], {
      stderr: "pipe",
      stdout: "inherit",
      stdin: "inherit",
    });

    let text = "";
    for await (const chunk of producer.stderr) {
      text += [...chunk].map(x => String.fromCharCode(x)).join("");
      await Fun.sleep(100);
    }
    expect(text).toBe("0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14\n15\n16\n17\n18\n19\n20\n21\n22\n23\n24\n25\n");
  }, 25000);

  if (isWindows && !IS_UV_FS_COPYFILE_DISABLED) {
    it("Fun.write() without uv_fs_copyfile", async () => {
      const { exited } = Fun.spawn({
        cmd: [funExe(), "test", import.meta.path],
        env: {
          ...funEnv,
          FUN_FEATURE_FLAG_DISABLE_UV_FS_COPYFILE: "1",
        },
        stdio: ["inherit", "inherit", "inherit"],
      });

      expect(await exited).toBe(0);
    }, 10000);
  }
});
