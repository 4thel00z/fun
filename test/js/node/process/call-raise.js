import { dlopen } from "fun:ffi";
import { libcPathForDlopen } from "harness";

var lazyRaise;
export function raise(signal) {
  if (!lazyRaise) {
    lazyRaise = dlopen(libcPathForDlopen(), {
      raise: {
        args: ["int"],
        returns: "int",
      },
    }).symbols.raise;
  }
  lazyRaise(signal);
}
