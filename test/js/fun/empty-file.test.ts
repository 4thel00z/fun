// See https://github.com/underdoc-org/fun/pull/7695
//
// A debug assertion was tripped when loading a module that was only a comment,
// as `String().releaseImpl().releaseNonNull()` will cause a null reference
//
// So this empty file will test this assertion never trips
