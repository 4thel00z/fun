// This file is intended to be able to run in Node and Fun
import { PassThrough, Readable, pipeline } from "node:stream";

pipeline(Readable.toWeb(process.stdin), new PassThrough(), process.stdout, () => {});
