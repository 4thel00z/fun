pub fn generate(key: []const u8, data: []const u8, algorithm: fun.jsc.API.Fun.Crypto.EVP.Algorithm, out: *[boring.EVP_MAX_MD_SIZE]u8) ?[]const u8 {
    var outlen: c_uint = boring.EVP_MAX_MD_SIZE;
    if (boring.HMAC(
        algorithm.md() orelse fun.Output.panic("Expected BoringSSL algorithm for HMAC", .{}),
        key.ptr,
        key.len,
        data.ptr,
        data.len,
        out,
        &outlen,
    ) == null) {
        return null;
    }

    return out[0..outlen];
}

const fun = @import("fun");
const boring = fun.BoringSSL.c;
