let e = new Error();

const { noInline } = require("fun:jsc");

function sloppyWrapperFn() {
  sloppyFn();
}
noInline(sloppyWrapperFn);

function sloppyFn() {
  Error.captureStackTrace(e);
  module.exports = e.stack;
}
noInline(sloppyFn);
sloppyWrapperFn();
