import { deepEquals } from "fun";
import { deserialize, serialize } from "fun:jsc";
const obj = { a: 1, b: 2 };
const buffer = serialize(obj);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const clone = deserialize(buffer);

if (deepEquals(obj, clone)) {
  console.log("They are equal!");
}
