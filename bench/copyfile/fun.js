import path from "path";
const input = path.resolve(process.argv[process.argv.length - 2]);
const output = path.resolve(process.argv[process.argv.length - 1]);

await Fun.write(Fun.file(output), Fun.file(input));
