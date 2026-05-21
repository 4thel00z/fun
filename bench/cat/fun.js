import { resolve } from "path";
const { write, stdout, file } = Fun;
const input = resolve(process.argv[process.argv.length - 1]);

await write(stdout, file(input));
