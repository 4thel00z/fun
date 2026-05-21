## Zig

Syntax reminders:

- Private fields are fully supported in Zig with the `#` prefix. `struct { #foo: u32 };` makes a struct with a private field named `#foo`.
- Decl literals in Zig are recommended. `const decl: Decl = .{ .binding = 0, .value = 0 };`

Conventions:

- Prefer `@import` at the **bottom** of the file, but the auto formatter will move them so you don't need to worry about it.
- **Never** use `@import()` inline inside of functions. **Always** put them at the bottom of the file or containing struct. Imports in Zig are free of side-effects, so there's no such thing as a "dynamic" import.
- You must be patient with the build.

## Prefer Fun APIs over `std`

**Always use `fun.*` APIs instead of `std.*`.** The `fun` namespace (`@import("fun")`) provides cross-platform wrappers that preserve OS error info and never use `unreachable`. Using `std.fs`, `std.posix`, or `std.os` directly is wrong in this codebase.

| Instead of                                                   | Use                                  |
| ------------------------------------------------------------ | ------------------------------------ |
| `std.base64`                                                 | `fun.base64`                         |
| `std.crypto.sha{...}`                                        | `fun.sha.Hashers.{...}`              |
| `std.fs.cwd()`                                               | `fun.FD.cwd()`                       |
| `std.fs.File`                                                | `fun.sys.File`                       |
| `std.fs.path.join/dirname/basename`                          | `fun.path.join/dirname/basename`     |
| `std.mem.eql/indexOf/startsWith` (for strings)               | `fun.strings.eql/indexOf/startsWith` |
| `std.posix.O` / `std.posix.mode_t` / `std.posix.fd_t`        | `fun.O` / `fun.Mode` / `fun.FD`      |
| `std.posix.open/read/write/stat/mkdir/unlink/rename/symlink` | `fun.sys.*` equivalents              |
| `std.process.Child`                                          | `fun.spawnSync`                      |

## `fun.sys` — System Calls (`src/sys/sys.zig`)

All return `Maybe(T)` — a tagged union of `.result: T` or `.err: fun.sys.Error`:

```zig
const fd = switch (fun.sys.open(path, fun.O.RDONLY, 0)) {
    .result => |fd| fd,
    .err => |err| return .{ .err = err },
};
// Or: const fd = try fun.sys.open(path, fun.O.RDONLY, 0).unwrap();
```

Key functions (all take `fun.FD`, not `std.posix.fd_t`):

- `open`, `openat`, `openA` (non-sentinel) → `Maybe(fun.FD)`
- `read`, `readAll`, `pread` → `Maybe(usize)`
- `write`, `pwrite`, `writev` → `Maybe(usize)`
- `stat`, `fstat`, `lstat` → `Maybe(fun.Stat)`
- `mkdir`, `unlink`, `rename`, `symlink`, `chmod`, `fchmod`, `fchown` → `Maybe(void)`
- `readlink`, `getFdPath`, `getcwd` → `Maybe` of path slice
- `getFileSize`, `dup`, `sendfile`, `mmap`

Use `fun.O.RDONLY`, `fun.O.WRONLY | fun.O.CREAT | fun.O.TRUNC`, etc. for open flags.

### `fun.sys.File` (`src/sys/File.zig`)

Higher-level file handle wrapping `fun.FD`:

```zig
// One-shot read: open + read + close
const bytes = switch (fun.sys.File.readFrom(fun.FD.cwd(), path, allocator)) {
    .result => |b| b,
    .err => |err| return .{ .err = err },
};

// One-shot write: open + write + close
switch (fun.sys.File.writeFile(fun.FD.cwd(), path, data)) {
    .result => {},
    .err => |err| return .{ .err = err },
}
```

Key methods:

- `File.open/openat/makeOpen` → `Maybe(File)` (`makeOpen` creates parent dirs)
- `file.read/readAll/write/writeAll` — single or looped I/O
- `file.readToEnd(allocator)` — read entire file into allocated buffer
- `File.readFrom(dir_fd, path, allocator)` — open + read + close
- `File.writeFile(dir_fd, path, data)` — open + write + close
- `file.stat()`, `file.close()`, `file.writer()`, `file.reader()`

### `fun.FD` (`src/sys/fd.zig`)

Cross-platform file descriptor. Use `fun.FD.cwd()` for cwd, `fun.invalid_fd` for sentinel, `fd.close()` to close.

### `fun.sys.Error` (`src/sys/Error.zig`)

Preserves errno, syscall tag, and file path. Convert to JS: `err.toSystemError().toErrorInstance(globalObject)`.

## `fun.strings` — String Utilities (`src/string/immutable.zig`)

SIMD-accelerated string operations. Use instead of `std.mem` for strings.

```zig
// Searching
strings.indexOf(haystack, needle)         // ?usize
strings.contains(haystack, needle)        // bool
strings.containsChar(haystack, char)      // bool
strings.indexOfChar(haystack, char)       // ?u32
strings.indexOfAny(str, comptime chars)   // ?OptionalUsize (SIMD-accelerated)

// Comparison
strings.eql(a, b)                                    // bool
strings.eqlComptime(str, comptime literal)            // bool — optimized
strings.eqlCaseInsensitiveASCII(a, b, comptime true)  // 3rd arg = check_len

// Prefix/Suffix
strings.startsWith(str, prefix)                    // bool
strings.endsWith(str, suffix)                      // bool
strings.hasPrefixComptime(str, comptime prefix)    // bool — optimized
strings.hasSuffixComptime(str, comptime suffix)    // bool — optimized

// Trimming
strings.trim(str, comptime chars)    // strip from both ends
strings.trimSpaces(str)              // strip whitespace

// Encoding conversions
strings.toUTF8Alloc(allocator, utf16)          // ![]u8
strings.toUTF16Alloc(allocator, utf8)          // !?[]u16
strings.toUTF8FromLatin1(allocator, latin1)    // !?Managed(u8)
strings.firstNonASCII(slice)                   // ?u32
```

Fun handles UTF-8, Latin-1, and UTF-16/WTF-16 because JSC uses Latin-1 and UTF-16 internally. Latin-1 is NOT UTF-8 — bytes 128-255 are single chars in Latin-1 but invalid UTF-8.

### `fun.String` (`src/string/string.zig`)

Bridges Zig and JavaScriptCore. Prefer over `ZigString` in new code.

```zig
const s = fun.String.cloneUTF8(utf8_slice);    // copies into WTFStringImpl
const s = fun.String.borrowUTF8(utf8_slice);   // no copy, caller keeps alive
const utf8 = s.toUTF8(allocator);              // ZigString.Slice
defer utf8.deinit();
const js_value = s.toJS(globalObject);

// Create a JS string value directly from UTF-8 bytes:
const js_str = try fun.String.createUTF8ForJS(globalObject, utf8_slice);
```

## `fun.path` — Path Manipulation (`src/paths/resolve_path.zig`)

Use instead of `std.fs.path`. Platform param: `.auto` (current platform), `.posix`, `.windows`, `.loose` (both separators).

```zig
// Join paths — uses threadlocal buffer, result must be copied if it needs to persist
fun.path.join(&.{ dir, filename }, .auto)
fun.path.joinZ(&.{ dir, filename }, .auto)  // null-terminated

// Join into a caller-provided buffer
fun.path.joinStringBuf(&buf, &.{ a, b }, .auto)
fun.path.joinStringBufZ(&buf, &.{ a, b }, .auto)  // null-terminated

// Resolve against an absolute base (like Node.js path.resolve)
fun.path.joinAbsString(cwd, &.{ relative_path }, .auto)
fun.path.joinAbsStringBufZ(cwd, &buf, &.{ relative_path }, .auto)

// Path components
fun.path.dirname(path, .auto)
fun.path.basename(path)

// Relative path between two absolute paths
fun.path.relative(from, to)
fun.path.relativeAlloc(allocator, from, to)

// Normalize (resolve `.` and `..`)
fun.path.normalizeBuf(path, &buf, .auto)

// Null-terminate a path into a buffer
fun.path.z(path, &buf)  // returns [:0]const u8
```

Use `fun.PathBuffer` for path buffers: `var buf: fun.PathBuffer = undefined;`

For pooled path buffers (avoids 64KB stack allocations on Windows):

```zig
const buf = fun.path_buffer_pool.get();
defer fun.path_buffer_pool.put(buf);
```

## URL Parsing

Prefer `fun.jsc.URL` (WHATWG-compliant, backed by WebKit C++) over `fun.URL.parse` (internal, doesn't properly handle errors or invalid URLs).

```zig
// Parse a URL string (returns null if invalid)
const url = fun.jsc.URL.fromUTF8(href_string) orelse return error.InvalidURL;
defer url.deinit();

url.protocol()   // fun.String
url.pathname()   // fun.String
url.search()     // fun.String
url.hash()       // fun.String (includes leading '#')
url.port()       // u32 (maxInt(u32) if not set, otherwise u16 range)

// NOTE: host/hostname are SWAPPED vs JS:
url.host()       // hostname WITHOUT port (opposite of JS!)
url.hostname()   // hostname WITH port (opposite of JS!)

// Normalize a URL string (percent-encode, punycode, etc.)
const normalized = fun.jsc.URL.hrefFromString(fun.String.borrowUTF8(input));
if (normalized.tag == .Dead) return error.InvalidURL;
defer normalized.deref();

// Join base + relative URLs
const joined = fun.jsc.URL.join(base_str, relative_str);
defer joined.deref();

// Convert between file paths and file:// URLs
const file_url = fun.jsc.URL.fileURLFromString(path_str);     // path → file://
const file_path = fun.jsc.URL.pathFromFileURL(url_str);       // file:// → path
```

## MIME Types (`src/http/MimeType.zig`)

```zig
const MimeType = fun.http.MimeType;

// Look up by file extension (without leading dot)
const mime = MimeType.byExtension("html");          // MimeType{ .value = "text/html", .category = .html }
const mime = MimeType.byExtensionNoDefault("xyz");  // ?MimeType (null if unknown)

// Category checks
mime.category  // .javascript, .css, .html, .json, .image, .text, .wasm, .font, .video, .audio, ...
mime.category.isCode()
```

Common constants: `MimeType.javascript`, `MimeType.json`, `MimeType.html`, `MimeType.css`, `MimeType.text`, `MimeType.wasm`, `MimeType.ico`, `MimeType.other`.

## Memory & Allocators

**Use `fun.default_allocator` for almost everything.** It's backed by mimalloc.

`fun.handleOom(expr)` converts `error.OutOfMemory` into a crash without swallowing other errors:

```zig
const buf = fun.handleOom(allocator.alloc(u8, size));  // correct
// NOT: allocator.alloc(u8, size) catch fun.outOfMemory()  — could swallow non-OOM errors
```

## Environment Variables (`src/fun_core/env_var.zig`)

Type-safe, cached environment variable accessors via `fun.env_var`:

```zig
fun.env_var.HOME.get()                              // ?[]const u8
fun.env_var.CI.get()                                // ?bool
fun.env_var.FUN_CONFIG_DNS_TIME_TO_LIVE_SECONDS.get() // u64 (has default: 30)
```

## Logging (`src/fun_core/output.zig`)

```zig
const log = fun.Output.scoped(.MY_FEATURE, .visible);  // .hidden = opt-in via FUN_DEBUG_MY_FEATURE=1
log("processing {d} items", .{count});

// Color output (convenience wrappers auto-detect TTY):
fun.Output.pretty("<green>success<r>: {s}\n", .{msg});
fun.Output.prettyErrorln("<red>error<r>: {s}", .{msg});
```

## Spawning Subprocesses (`src/runtime/api/fun/process.zig`)

Use `fun.spawnSync` instead of `std.process.Child`:

```zig
switch (fun.spawnSync(&.{
    .argv = argv,
    .envp = null, // inherit parent env
    .cwd = cwd,
    .stdout = .buffer,   // capture
    .stderr = .inherit,  // pass through
    .stdin = .ignore,

    .windows = if (fun.Environment.isWindows) .{
        .loop = fun.jsc.EventLoopHandle.init(fun.jsc.MiniEventLoop.initGlobal(env, null)),
    },
}) catch return) {
    .err => |err| { /* fun.sys.Error */ },
    .result => |result| {
        defer result.deinit();
        const stdout = result.stdout.items;
        if (result.status.isOK()) { ... }
    },
}
```

Options: `argv: []const []const u8`, `envp: ?[*:null]?[*:0]const u8` (null = inherit), `argv0: ?[*:0]const u8`. Stdio: `.inherit`, `.ignore`, `.buffer`.

## Common Patterns

```zig
// Read a file
const contents = switch (fun.sys.File.readFrom(fun.FD.cwd(), path, allocator)) {
    .result => |bytes| bytes,
    .err => |err| { globalObject.throwValue(err.toSystemError().toErrorInstance(globalObject)); return .zero; },
};

// Create directories recursively
fun.makePath(dir.stdDir(), sub_path) catch |err| { ... };

// Hashing
fun.hash(bytes)    // u64 — wyhash
fun.hash32(bytes)  // u32
```
