#include "root.h"

#include "ZigGlobalObject.h"
#include "JavaScriptCore/JSCJSValue.h"
#include "JavaScriptCore/JSCast.h"
#include "JavaScriptCore/JSArrayBufferView.h"
#include "headers-handwritten.h"
#include <wtf/text/StringImpl.h>
#include <wtf/text/WTFString.h>

#if ASAN_ENABLED
#include <sanitizer/lsan_interface.h>
#endif

extern "C" void FunString__toThreadSafe(FunString* str);

namespace Fun {

using namespace JSC;

JSC_DEFINE_HOST_FUNCTION(jsFunction_arrayBufferViewHasBuffer, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto value = callFrame->argument(0);
    auto view = uncheckedDowncast<WebCore::JSArrayBufferView>(value);
    return JSValue::encode(jsBoolean(view->hasArrayBuffer()));
}

JSC_DEFINE_HOST_FUNCTION(jsFunction_hasReifiedStatic, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto object = callFrame->argument(0).getObject();
    if (!object) {
        return JSValue::encode(jsBoolean(false));
    }

    if (object->hasNonReifiedStaticProperties()) {
        return JSValue::encode(jsBoolean(true));
    }

    return JSValue::encode(jsBoolean(false));
}

JSC_DEFINE_HOST_FUNCTION(jsFunction_lsanDoLeakCheck, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
#if ASAN_ENABLED
    return JSValue::encode(jsNumber(__lsan_do_recoverable_leak_check()));
#endif
    return encodedJSUndefined();
}

// Returns the net refcount change on the *original* StringImpl after a
// FunString owning one ref to it is passed through FunString__toThreadSafe
// and then released. A correct implementation must return 0; a positive
// value means FunString__toThreadSafe leaked a reference to the original
// StringImpl when it installed the isolated copy.
JSC_DEFINE_HOST_FUNCTION(jsFunction_FunString_toThreadSafeRefCountDelta, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    // Create a fresh, non-static, non-atom StringImpl with exactly one ref
    // held by `original`.
    Ref<WTF::StringImpl> original = WTF::String::fromLatin1("FunString__toThreadSafe leak test").releaseImpl().releaseNonNull();

    const unsigned before = original->refCount();

    // Give the FunString its own ref, mirroring how a Zig-side fun.String
    // owns one reference to the underlying StringImpl.
    original->ref();
    FunString str = { FunStringTag::WTFStringImpl, { .wtf = original.ptr() } };

    FunString__toThreadSafe(&str);

    // Drop whatever the FunString now owns (the isolated copy, or the
    // original if the implementation ever decides no copy is needed).
    ASSERT(str.tag == FunStringTag::WTFStringImpl);
    str.impl.wtf->deref();

    const unsigned after = original->refCount();
    return JSValue::encode(jsNumber(static_cast<int32_t>(after) - static_cast<int32_t>(before)));
}

}
