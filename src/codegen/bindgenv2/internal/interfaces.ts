import { CodeStyle, Type } from "./base";

export const ArrayBuffer = new (class extends Type {
  get idlType() {
    return `::Fun::IDLArrayBufferRef`;
  }
  get bindgenType() {
    return `bindgen.BindgenArrayBuffer`;
  }
  zigType(style?: CodeStyle) {
    return "fun.fun_js.jsc.JSCArrayBuffer.Ref";
  }
  optionalZigType(style?: CodeStyle) {
    return this.zigType(style) + ".Optional";
  }
  toCpp(value: any): string {
    throw RangeError("default values for `ArrayBuffer` are not supported");
  }
})();

export const Blob = new (class extends Type {
  get idlType() {
    return `::Fun::IDLBlobRef`;
  }
  get bindgenType() {
    return `bindgen.BindgenBlob`;
  }
  zigType(style?: CodeStyle) {
    return "fun.fun_js.webcore.Blob.Ref";
  }
  optionalZigType(style?: CodeStyle) {
    return this.zigType(style) + ".Optional";
  }
  toCpp(value: any): string {
    throw RangeError("default values for `Blob` are not supported");
  }
  getHeaders(result: Set<string>): void {
    result.add("FunIDLConvertBlob.h");
  }
})();
