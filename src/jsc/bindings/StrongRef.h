#pragma once
#include <JavaScriptCore/JSCJSValue.h>
#include <memory>

extern "C" void Fun__StrongRef__delete(JSC::JSValue* _Nonnull handleSlot);
extern "C" JSC::JSValue* Fun__StrongRef__new(JSC::JSGlobalObject* globalObject, JSC::EncodedJSValue encodedValue);
extern "C" void Fun__StrongRef__set(JSC::JSValue* _Nonnull handleSlot, JSC::JSGlobalObject* globalObject, JSC::EncodedJSValue encodedValue);
extern "C" void Fun__StrongRef__clear(JSC::JSValue* _Nonnull handleSlot);

namespace Fun {

struct StrongRefDeleter {
    // `std::unique_ptr` will never call this with a null pointer.
    void operator()(JSC::JSValue* _Nonnull handleSlot)
    {
        Fun__StrongRef__delete(handleSlot);
    }
};

using StrongRef = std::unique_ptr<JSC::JSValue, StrongRefDeleter>;

}
