// The object returned by Fun.serve's .requestIP()
#pragma once
#include "headers.h"
#include "root.h"
#include "JavaScriptCore/JSObjectInlines.h"
#include "ZigGlobalObject.h"

using namespace JSC;

namespace Fun {
namespace JSSocketAddressDTO {

Structure* createStructure(VM& vm, JSGlobalObject* globalObject);
JSObject* create(Zig::GlobalObject* globalObject, JSString* value, int port, bool isIPv6);

} // namespace JSSocketAddress
} // namespace Fun

extern "C" JSC::EncodedJSValue JSSocketAddressDTO__create(JSGlobalObject* globalObject, EncodedJSValue address, uint16_t port, bool isIPv6);
