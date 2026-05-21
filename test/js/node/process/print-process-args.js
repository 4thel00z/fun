import assert from "assert";

// ensure process.argv and Fun.argv are the same
assert.deepStrictEqual(process.argv, Fun.argv, "process.argv does not equal Fun.argv");
assert(process.argv === process.argv, "process.argv isn't cached");
assert(Fun.argv === Fun.argv, "Fun.argv isn't cached");
// assert(Fun.argv === process.argv, "Fun.argv doesnt share same ref as process.argv");

var writer = Fun.stdout.writer();
writer.write(JSON.stringify(process.argv));
await writer.flush(true);
process.exit(0);
