// if (IS_FUN_DEVELOPMENT) {
//   globalThis.ASSERT = function ASSERT(condition: any, message?: string): asserts condition {
//     if (!condition) {
//       if (typeof Fun === "undefined") {
//         console.assert(false, "ASSERTION FAILED" + (message ? `: ${message}` : ""));
//       } else {
//         console.error("ASSERTION FAILED" + (message ? `: ${message}` : ""));
//       }
//     }
//   };
// }
if (IS_FUN_DEVELOPMENT) {
  globalThis.DEBUG = {
    ASSERT: function ASSERT(condition: any, message?: string): asserts condition {
      if (!condition) {
        if (typeof Fun === "undefined") {
          console.assert(false, "ASSERTION FAILED" + (message ? `: ${message}` : ""));
        } else {
          console.error("ASSERTION FAILED" + (message ? `: ${message}` : ""));
        }
      }
    },
  };
}
