Fun.hash.wyhash("asdf", 1234n);

// https://github.com/underdoc-org/fun/issues/26043
// Fun.hash.crc32 accepts optional seed parameter for incremental CRC32 computation
let crc = 0;
crc = Fun.hash.crc32(new Uint8Array([1, 2, 3]), crc);
crc = Fun.hash.crc32(new Uint8Array([4, 5, 6]), crc);
