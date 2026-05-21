

#include "FunString.h"
#include "helpers.h"
#include "root.h"
#include "headers-handwritten.h"
#include <JavaScriptCore/JSCJSValueInlines.h>

#include "JavaScriptCore/JSCJSValue.h"
#include "JavaScriptCore/PutPropertySlot.h"

#include "wtf/SIMDUTF.h"
#include "JSDOMURL.h"
#include "DOMURL.h"
#include "ZigGlobalObject.h"
#include "IDLTypes.h"
#include "mimalloc.h"

#include <limits>
#include <wtf/Seconds.h>
#include <wtf/text/ExternalStringImpl.h>
#include <JavaScriptCore/JSONObject.h>
#include <wtf/text/AtomString.h>
#include <wtf/text/WTFString.h>

#include "JSDOMWrapperCache.h"
#include "JSDOMAttribute.h"
#include "JSDOMBinding.h"
#include "JSDOMConstructor.h"
#include "JSDOMConvertAny.h"
#include "JSDOMConvertBase.h"
#include "JSDOMConvertBoolean.h"
#include "JSDOMConvertInterface.h"
#include "JSDOMConvertStrings.h"
#include "JSDOMExceptionHandling.h"
#include "JSDOMGlobalObjectInlines.h"
#include "JSDOMOperation.h"

#include "GCDefferalContext.h"
#include "wtf/StdLibExtras.h"
#include "wtf/text/StringImpl.h"
#include "wtf/text/StringToIntegerConversion.h"
#include "ErrorCode.h"

using namespace JSC;
extern "C" FunString FunString__fromBytes(const char* bytes, size_t length);

extern "C" [[ZIG_EXPORT(nothrow)]] bool Fun__WTFStringImpl__hasPrefix(const WTF::StringImpl* impl, const char* bytes, size_t length)
{
    return impl->startsWith({ bytes, length });
}

extern "C" [[ZIG_EXPORT(nothrow)]] void Fun__WTFStringImpl__deref(WTF::StringImpl* impl)
{
    impl->deref();
}
extern "C" [[ZIG_EXPORT(nothrow)]] void Fun__WTFStringImpl__ref(WTF::StringImpl* impl)
{
    impl->ref();
}

extern "C" [[ZIG_EXPORT(nothrow)]] bool FunString__fromJS(JSC::JSGlobalObject* globalObject, JSC::EncodedJSValue encodedValue, FunString* funString)
{
    JSC::JSValue value = JSC::JSValue::decode(encodedValue);
    *funString = Fun::toString(globalObject, value);
    return funString->tag != FunStringTag::Dead;
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__createAtom(const char* bytes, size_t length)
{
    ASSERT(simdutf::validate_ascii(bytes, length));
    auto atom = tryMakeAtomString(String(StringImpl::createWithoutCopying({ bytes, length })));
    return { FunStringTag::WTFStringImpl, { .wtf = atom.releaseImpl().leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__tryCreateAtom(const char* bytes, size_t length)
{
    if (simdutf::validate_ascii(bytes, length)) {
        auto atom = tryMakeAtomString(String(StringImpl::createWithoutCopying({ bytes, length })));
        if (atom.isNull())
            return { FunStringTag::Dead, {} };
        return { FunStringTag::WTFStringImpl, { .wtf = atom.releaseImpl().leakRef() } };
    }

    return { FunStringTag::Dead, {} };
}

extern "C" [[ZIG_EXPORT(zero_is_throw)]] JSC::EncodedJSValue FunString__createUTF8ForJS(JSC::JSGlobalObject* globalObject, const char* ptr, size_t length)
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    if (length == 0) {
        return JSValue::encode(jsEmptyString(vm));
    }
    if (simdutf::validate_ascii(ptr, length)) {
        return JSValue::encode(jsString(vm, WTF::String(std::span<const Latin1Character>(reinterpret_cast<const Latin1Character*>(ptr), length))));
    }

    auto str = WTF::String::fromUTF8ReplacingInvalidSequences(std::span { reinterpret_cast<const Latin1Character*>(ptr), length });
    EXCEPTION_ASSERT(str.isNull() == !!scope.exception());
    if (str.isNull()) [[unlikely]] {
        throwOutOfMemoryError(globalObject, scope);
        return {};
    }
    scope.assertNoException();
    return JSValue::encode(jsString(vm, WTF::move(str)));
}

extern "C" [[ZIG_EXPORT(zero_is_throw)]] JSC::EncodedJSValue FunString__transferToJS(FunString* funString, JSC::JSGlobalObject* globalObject)
{
    auto& vm = JSC::getVM(globalObject);

    if (funString->tag == FunStringTag::Empty) [[unlikely]] {
        return JSValue::encode(JSC::jsEmptyString(vm));
    }

    if (funString->tag == FunStringTag::Dead) [[unlikely]] {
        auto scope = DECLARE_THROW_SCOPE(vm);
        return Fun::ERR::STRING_TOO_LONG(scope, globalObject);
    }

    if (funString->tag == FunStringTag::WTFStringImpl) [[likely]] {
#if ASSERT_ENABLED
        unsigned refCount = funString->impl.wtf->refCount();
        ASSERT(refCount > 0 && !funString->impl.wtf->isEmpty());
#endif
        auto str = funString->toWTFString();
#if ASSERT_ENABLED
        unsigned newRefCount = funString->impl.wtf->refCount();
        ASSERT(newRefCount == refCount + 1);
#endif
        funString->impl.wtf->deref();
        *funString = { .tag = FunStringTag::Dead };
        return JSValue::encode(jsString(vm, WTF::move(str)));
    }

    WTF::String str = funString->toWTFString();
    *funString = { .tag = FunStringTag::Dead };
    return JSValue::encode(jsString(vm, WTF::move(str)));
}

// int64_t max to say "not a number"
extern "C" [[ZIG_EXPORT(nothrow)]] int64_t FunString__toInt32(const FunString* funString)
{
    if (funString->tag == FunStringTag::Empty || funString->tag == FunStringTag::Dead) {
        return std::numeric_limits<int64_t>::max();
    }

    String str = funString->toWTFString();
    auto val = WTF::parseIntegerAllowingTrailingJunk<int32_t>(str);
    if (val) {
        return val.value();
    }

    return std::numeric_limits<int64_t>::max();
}

namespace Fun {

JSC::JSString* toJS(JSC::JSGlobalObject* globalObject, FunString funString)
{
    if (funString.tag == FunStringTag::Empty) {
        return JSC::jsEmptyString(globalObject->vm());
    }

    if (funString.tag == FunStringTag::Dead) [[unlikely]] {
        auto scope = DECLARE_THROW_SCOPE(globalObject->vm());
        Fun::ERR::STRING_TOO_LONG(scope, globalObject);
        return nullptr;
    }

    if (funString.tag == FunStringTag::WTFStringImpl) {
#if ASSERT_ENABLED
        ASSERT(funString.impl.wtf->hasAtLeastOneRef() && !funString.impl.wtf->isEmpty());
#endif

        return JSC::jsString(globalObject->vm(), String(funString.impl.wtf));
    }

    if (funString.tag == FunStringTag::StaticZigString) {
        return JSC::jsString(globalObject->vm(), Zig::toStringStatic(funString.impl.zig));
    }

    if (funString.tag == FunStringTag::ZigString) {
        return Zig::toJSStringGC(funString.impl.zig, globalObject);
    }

    UNREACHABLE();
}

FunString toString(const char* bytes, size_t length)
{
    return FunString__fromBytes(bytes, length);
}

FunString fromJS(JSC::JSGlobalObject* globalObject, JSValue value)
{
    WTF::String str = value.toWTFString(globalObject);
    if (str.isNull()) [[unlikely]] {
        return { FunStringTag::Dead };
    }
    if (str.length() == 0) [[unlikely]] {
        return { FunStringTag::Empty };
    }

    auto impl = str.releaseImpl();

    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] void FunString__toThreadSafe(FunString* str)
{
    if (str->tag == FunStringTag::WTFStringImpl) {
        auto* existing = str->impl.wtf;
        // StringImpl::isolatedCopy() always returns a freshly-allocated impl,
        // so when we replace the pointer we must release the ref we were
        // holding to the original; otherwise every call leaks one ref.
        auto impl = existing->isolatedCopy();
        if (impl.ptr() != existing) {
            str->impl.wtf = &impl.leakRef();
            existing->deref();
        }
    }
}

FunString toString(JSC::JSGlobalObject* globalObject, JSValue value)
{
    return fromJS(globalObject, value);
}

FunString toStringRef(JSC::JSGlobalObject* globalObject, JSValue value)
{
    auto str = value.toWTFString(globalObject);
    if (str.isNull()) [[unlikely]] {
        return { FunStringTag::Dead };
    }
    if (str.length() == 0) [[unlikely]] {
        return { FunStringTag::Empty };
    }

    StringImpl* impl = str.impl();

    impl->ref();

    return { FunStringTag::WTFStringImpl, { .wtf = impl } };
}

FunString toString(WTF::String& wtfString)
{
    if (wtfString.isEmpty())
        return { FunStringTag::Empty };

    return { FunStringTag::WTFStringImpl, { .wtf = wtfString.impl() } };
}
FunString toString(const WTF::String& wtfString)
{
    if (wtfString.isEmpty())
        return { FunStringTag::Empty };

    return { FunStringTag::WTFStringImpl, { .wtf = wtfString.impl() } };
}
FunString toString(WTF::StringImpl* wtfString)
{
    if (wtfString->isEmpty())
        return { FunStringTag::Empty };

    return { FunStringTag::WTFStringImpl, { .wtf = wtfString } };
}

FunString toStringRef(WTF::String& wtfString)
{
    if (wtfString.isEmpty())
        return { FunStringTag::Empty };

    wtfString.impl()->ref();
    return { FunStringTag::WTFStringImpl, { .wtf = wtfString.impl() } };
}
FunString toStringRef(const WTF::String& wtfString)
{
    if (wtfString.isEmpty())
        return { FunStringTag::Empty };

    wtfString.impl()->ref();
    return { FunStringTag::WTFStringImpl, { .wtf = wtfString.impl() } };
}
FunString toStringRef(WTF::StringImpl* wtfString)
{
    if (wtfString->isEmpty())
        return { FunStringTag::Empty };

    wtfString->ref();

    return { FunStringTag::WTFStringImpl, { .wtf = wtfString } };
}

FunString toStringView(StringView view)
{
    return {
        FunStringTag::ZigString,
        { .zig = toZigString(view) }
    };
}

// We don't want to ban atomiziation for tiny strings that are potentially going
// to appear as properties/identifiers in JS. So we should only do this for long
// strings that are unlikely to ever be atomized.
static constexpr unsigned int kMinCrossThreadShareableLength = 256;

bool isCrossThreadShareable(const WTF::String& string)
{
    if (string.length() < kMinCrossThreadShareableLength)
        return false;

    const auto* impl = string.impl();

    // 1) Never share AtomStringImpl/symbols - they have special thread-unsafe behavior
    if (impl->isAtom() || impl->isSymbol())
        return false;

    // 2) Don't share slices
    if (impl->bufferOwnership() == StringImpl::BufferSubstring)
        return false;

    return true;
}

Ref<WTF::StringImpl> toCrossThreadShareable(Ref<WTF::StringImpl> impl)
{
    if (impl->isAtom() || impl->isSymbol())
        return impl->isolatedCopy();

    if (impl->bufferOwnership() == StringImpl::BufferSubstring)
        return impl->isolatedCopy();

    if (impl->length() < kMinCrossThreadShareableLength)
        return impl->isolatedCopy();

    // 3) Ensure we won't lazily touch hash/flags on the consumer thread
    // Force hash computation on this thread before sharing
    impl->hash();
    impl->setNeverAtomize();

    return impl;
}

WTF::String toCrossThreadShareable(const WTF::String& string)
{
    if (string.length() < kMinCrossThreadShareableLength)
        return string.isolatedCopy();

    auto* impl = string.impl();

    // 1) Never share AtomStringImpl/symbols - they have special thread-unsafe behavior
    if (impl->isAtom() || impl->isSymbol())
        return string.isolatedCopy();

    // 2) Don't share slices
    if (impl->bufferOwnership() == StringImpl::BufferSubstring)
        return string.isolatedCopy();

    // 3) Ensure we won't lazily touch hash/flags on the consumer thread
    // Force hash computation on this thread before sharing
    const_cast<StringImpl*>(impl)->hash();
    const_cast<StringImpl*>(impl)->setNeverAtomize();

    return string;
}

}

extern "C" [[ZIG_EXPORT(zero_is_throw)]] JSC::EncodedJSValue FunString__toJS(JSC::JSGlobalObject* globalObject, const FunString* funString)
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    auto* result = Fun::toJS(globalObject, *funString);
    RETURN_IF_EXCEPTION(scope, {});
    if (!result) [[unlikely]] {
        return {};
    }
    return JSValue::encode(result);
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromUTF16Unitialized(size_t length)
{
    ASSERT(length > 0);
    std::span<char16_t> ptr;
    auto impl = WTF::StringImpl::tryCreateUninitialized(length, ptr);
    if (!impl) [[unlikely]] {
        return { .tag = FunStringTag::Dead };
    }
    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromLatin1Unitialized(size_t length)
{
    ASSERT(length > 0);
    std::span<Latin1Character> ptr;
    auto impl = WTF::StringImpl::tryCreateUninitialized(length, ptr);
    if (!impl) [[unlikely]] {
        return { .tag = FunStringTag::Dead };
    }
    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" FunString FunString__fromUTF8(const char* bytes, size_t length)
{
    ASSERT(length > 0);
    if (simdutf::validate_utf8(bytes, length)) {
        size_t u16Length = simdutf::utf16_length_from_utf8(bytes, length);
        std::span<char16_t> ptr;
        auto impl = WTF::StringImpl::tryCreateUninitialized(static_cast<unsigned int>(u16Length), ptr);
        if (!impl) [[unlikely]] {
            return { .tag = FunStringTag::Dead };
        }
        RELEASE_ASSERT(simdutf::convert_utf8_to_utf16(bytes, length, ptr.data()) == u16Length);
        return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
    }

    auto str = WTF::String::fromUTF8ReplacingInvalidSequences(std::span { reinterpret_cast<const Latin1Character*>(bytes), length });
    if (str.isNull()) [[unlikely]] {
        return { .tag = FunStringTag::Dead };
    }
    auto impl = str.releaseImpl();
    return Fun::toString(impl.leakRef());
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromLatin1(const char* bytes, size_t length)
{
    ASSERT(length > 0);
    std::span<Latin1Character> ptr;
    auto impl = WTF::StringImpl::tryCreateUninitialized(length, ptr);
    if (!impl) [[unlikely]] {
        return { .tag = FunStringTag::Dead };
    }
    memcpy(ptr.data(), bytes, length);

    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromUTF16ToLatin1(const char16_t* bytes, size_t length)
{
    ASSERT(length > 0);
    ASSERT_WITH_MESSAGE(simdutf::validate_utf16le(bytes, length), "This function only accepts ascii UTF16 strings");
    size_t outLength = simdutf::latin1_length_from_utf16(length);
    std::span<Latin1Character> ptr;
    auto impl = WTF::StringImpl::tryCreateUninitialized(outLength, ptr);
    if (!impl) [[unlikely]] {
        return { FunStringTag::Dead };
    }

    size_t latin1_length = simdutf::convert_valid_utf16le_to_latin1(bytes, length, reinterpret_cast<char*>(ptr.data()));
    ASSERT_WITH_MESSAGE(latin1_length == outLength, "Failed to convert UTF16 to Latin1");
    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromUTF16(const char16_t* bytes, size_t length)
{
    ASSERT(length > 0);
    std::span<char16_t> ptr;
    auto impl = WTF::StringImpl::tryCreateUninitialized(length, ptr);
    if (!impl) [[unlikely]] {
        return { .tag = FunStringTag::Dead };
    }
    memcpy(ptr.data(), bytes, length * sizeof(char16_t));
    return { FunStringTag::WTFStringImpl, { .wtf = impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] FunString FunString__fromBytes(const char* bytes, size_t length)
{
    ASSERT(length > 0);
    if (simdutf::validate_ascii(bytes, length)) {
        return FunString__fromLatin1(bytes, length);
    }

    return FunString__fromUTF8(bytes, length);
}

extern "C" FunString FunString__createStaticExternal(const char* bytes, size_t length, bool isLatin1)
{
    Ref<WTF::ExternalStringImpl> impl = isLatin1 ? WTF::ExternalStringImpl::createStatic({ reinterpret_cast<const Latin1Character*>(bytes), length }) :

                                                 WTF::ExternalStringImpl::createStatic({ reinterpret_cast<const char16_t*>(bytes), length });

    return { FunStringTag::WTFStringImpl, { .wtf = &impl.leakRef() } };
}

extern "C" FunString FunString__createExternal(const char* bytes, size_t length, bool isLatin1, void* ctx, void (*callback)(void* arg0, void* arg1, size_t arg2))
{
    Ref<WTF::ExternalStringImpl> impl = isLatin1 ? WTF::ExternalStringImpl::create({ reinterpret_cast<const Latin1Character*>(bytes), length }, ctx, callback) :

                                                 WTF::ExternalStringImpl::create({ reinterpret_cast<const char16_t*>(bytes), length }, ctx, callback);

    return { FunStringTag::WTFStringImpl, { .wtf = &impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(zero_is_throw)]] JSC::EncodedJSValue FunString__toJSON(
    JSC::JSGlobalObject* globalObject,
    FunString* funString)
{
    auto scope = DECLARE_THROW_SCOPE(globalObject->vm());
    JSC::JSValue result = JSC::JSONParse(globalObject, funString->toWTFString());

    if (!result && !scope.exception()) {
        scope.throwException(globalObject, createSyntaxError(globalObject, "Failed to parse JSON"_s));
    }

    RETURN_IF_EXCEPTION(scope, {});

    return JSC::JSValue::encode(result);
}

extern "C" JSC::EncodedJSValue FunString__createArray(
    JSC::JSGlobalObject* globalObject,
    const FunString* ptr, size_t length)
{
    if (length == 0)
        return JSValue::encode(JSC::constructEmptyArray(globalObject, nullptr));

    auto& vm = JSC::getVM(globalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    // Using tryCreateUninitialized here breaks stuff..
    // https://github.com/underdoc-org/fun/issues/3931
    JSC::JSArray* array = constructEmptyArray(globalObject, nullptr, length);
    RETURN_IF_EXCEPTION(throwScope, {});

    for (size_t i = 0; i < length; ++i) {
        auto* str = Fun::toJS(globalObject, *ptr++);
        RETURN_IF_EXCEPTION(throwScope, {});
        array->putDirectIndex(globalObject, i, str);
        RETURN_IF_EXCEPTION(throwScope, {});
    }

    return JSValue::encode(array);
}

extern "C" [[ZIG_EXPORT(nothrow)]] void FunString__toWTFString(FunString* funString)
{
    WTF::String str;
    if (funString->tag == FunStringTag::ZigString) {
        if (Zig::isTaggedExternalPtr(funString->impl.zig.ptr)) {
            str = Zig::toString(funString->impl.zig);
        } else {
            str = Zig::toStringCopy(funString->impl.zig);
        }

    } else if (funString->tag == FunStringTag::StaticZigString) {
        str = Zig::toStringStatic(funString->impl.zig);
    } else {
        return;
    }

    auto impl = str.releaseImpl();
    funString->impl.wtf = impl.leakRef();
    funString->tag = FunStringTag::WTFStringImpl;
}

extern "C" FunString URL__getFileURLString(FunString* filePath)
{
    return Fun::toStringRef(WTF::URL::fileURLWithFileSystemPath(filePath->toWTFString()).stringWithoutFragmentIdentifier());
}

extern "C" size_t URL__originLength(const char* latin1_slice, size_t len)
{
    WTF::String string = WTF::StringView(latin1_slice, len, true).toString();
    if (!string)
        return 0;
    WTF::URL url(string);
    if (!url.isValid())
        return 0;
    return url.pathStart();
}

extern "C" JSC::EncodedJSValue FunString__toJSDOMURL(JSC::JSGlobalObject* lexicalGlobalObject, FunString* funString)
{
    auto& globalObject = *uncheckedDowncast<Zig::GlobalObject>(lexicalGlobalObject);
    auto& vm = globalObject.vm();
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto str = funString->toWTFString(FunString::ZeroCopy);

    auto object = WebCore::DOMURL::create(str, String());
    auto jsValue = WebCore::toJSNewlyCreated<WebCore::IDLInterface<WebCore::DOMURL>>(*lexicalGlobalObject, globalObject, throwScope, WTF::move(object));
    RETURN_IF_EXCEPTION(throwScope, {});
    auto* jsDOMURL = uncheckedDowncast<WebCore::JSDOMURL>(jsValue.asCell());
    vm.heap.reportExtraMemoryAllocated(jsDOMURL, jsDOMURL->wrapped().memoryCostForGC());
    RELEASE_AND_RETURN(throwScope, JSC::JSValue::encode(jsValue));
}

extern "C" WTF::URL* URL__fromJS(EncodedJSValue encodedValue, JSC::JSGlobalObject* globalObject)
{
    auto throwScope = DECLARE_THROW_SCOPE(globalObject->vm());
    JSC::JSValue value = JSC::JSValue::decode(encodedValue);
    auto str = value.toWTFString(globalObject);
    RETURN_IF_EXCEPTION(throwScope, nullptr);
    if (str.isEmpty()) {
        return nullptr;
    }

    auto url = WTF::URL(str);
    if (!url.isValid() || url.isNull())
        return nullptr;

    return new WTF::URL(WTF::move(url));
}

extern "C" FunString URL__getHrefFromJS(EncodedJSValue encodedValue, JSC::JSGlobalObject* globalObject)
{
    auto throwScope = DECLARE_THROW_SCOPE(globalObject->vm());
    JSC::JSValue value = JSC::JSValue::decode(encodedValue);
    auto str = value.toWTFString(globalObject);
    RETURN_IF_EXCEPTION(throwScope, { FunStringTag::Dead });
    if (str.isEmpty()) {
        return { FunStringTag::Dead };
    }

    auto url = WTF::URL(str);
    if (!url.isValid() || url.isEmpty())
        return { FunStringTag::Dead };

    return Fun::toStringRef(url.string());
}

extern "C" FunString URL__getHref(FunString* input)
{
    auto&& str = input->toWTFString();
    auto url = WTF::URL(str);
    if (!url.isValid() || url.isEmpty())
        return { FunStringTag::Dead };

    return Fun::toStringRef(url.string());
}

extern "C" FunString URL__pathFromFileURL(FunString* input)
{
    auto&& str = input->toWTFString();
    auto url = WTF::URL(str);
    if (!url.isValid() || url.isEmpty())
        return { FunStringTag::Dead };

    return Fun::toStringRef(url.fileSystemPath());
}

extern "C" FunString URL__getHrefJoin(FunString* baseStr, FunString* relativeStr)
{
    auto base = baseStr->toWTFString();
    auto relative = relativeStr->toWTFString();
    auto url = WTF::URL(WTF::URL(base), relative);
    if (!url.isValid() || url.isEmpty())
        return { FunStringTag::Dead };

    return Fun::toStringRef(url.string());
}

extern "C" FunString URL__hash(WTF::URL* url)
{
    const auto& fragment = url->fragmentIdentifier().isEmpty()
        ? emptyString()
        : url->fragmentIdentifierWithLeadingNumberSign().toStringWithoutCopying();
    return Fun::toStringRef(fragment);
}

extern "C" FunString URL__fragmentIdentifier(WTF::URL* url)
{
    const auto& fragment = url->fragmentIdentifier().isEmpty()
        ? emptyString()
        : url->fragmentIdentifier().toStringWithoutCopying();
    return Fun::toStringRef(fragment);
}

extern "C" WTF::URL* URL__fromString(FunString* input)
{
    auto&& str = input->toWTFString();
    auto url = WTF::URL(str);
    if (!url.isValid())
        return nullptr;

    return new WTF::URL(WTF::move(url));
}

extern "C" FunString URL__protocol(WTF::URL* url)
{
    return Fun::toStringRef(url->protocol().toStringWithoutCopying());
}

extern "C" void URL__deinit(WTF::URL* url)
{
    delete url;
}

extern "C" FunString URL__href(WTF::URL* url)
{
    return Fun::toStringRef(url->string());
}

extern "C" FunString URL__username(WTF::URL* url)
{
    return Fun::toStringRef(url->user());
}

extern "C" FunString URL__password(WTF::URL* url)
{
    return Fun::toStringRef(url->password());
}

extern "C" FunString URL__search(WTF::URL* url)
{
    return Fun::toStringRef(url->query().toStringWithoutCopying());
}

/// Returns the host WITHOUT the port.
///
/// Note that this does NOT match JS behavior, which returns the host with the port.
///
/// ```
/// URL("http://example.com:8080").host() => "example.com"
/// ```
extern "C" FunString URL__host(WTF::URL* url)
{
    return Fun::toStringRef(url->host().toStringWithoutCopying());
}

/// Returns the host WITH the port.
///
/// Note that this does NOT match JS behavior which returns the host without the port.
///
/// ```
/// URL("http://example.com:8080").hostname() => "example.com:8080"
/// ```
extern "C" FunString URL__hostname(WTF::URL* url)
{
    return Fun::toStringRef(url->hostAndPort());
}

extern "C" uint32_t URL__port(WTF::URL* url)
{
    auto port = url->port();

    if (port.has_value()) {
        return port.value();
    }

    return std::numeric_limits<uint32_t>::max();
}

extern "C" FunString URL__pathname(WTF::URL* url)
{
    return Fun::toStringRef(url->path().toStringWithoutCopying());
}

size_t FunString::utf8ByteLength(const WTF::String& str)
{
    if (str.isEmpty())
        return 0;

    if (str.is8Bit()) {
        const auto s = str.span8();
        return simdutf::utf8_length_from_latin1(reinterpret_cast<const char*>(s.data()), static_cast<size_t>(s.size()));
    } else {
        const auto s = str.span16();
        return simdutf::utf8_length_from_utf16(reinterpret_cast<const char16_t*>(s.data()), static_cast<size_t>(s.size()));
    }
}

WTF::String FunString::toWTFString() const
{
    if (this->tag == FunStringTag::ZigString) {
        if (Zig::isTaggedExternalPtr(this->impl.zig.ptr)) {
            return Zig::toString(this->impl.zig);
        } else {
            return Zig::toStringCopy(this->impl.zig);
        }
    } else if (this->tag == FunStringTag::StaticZigString) {
        return Zig::toStringCopy(this->impl.zig);
    } else if (this->tag == FunStringTag::WTFStringImpl) {
        return WTF::String(this->impl.wtf);
    }

    return WTF::String();
}

void FunString::appendToBuilder(WTF::StringBuilder& builder) const
{
    if (this->tag == FunStringTag::WTFStringImpl) {
        builder.append(this->impl.wtf);
        return;
    }

    if (this->tag == FunStringTag::ZigString || this->tag == FunStringTag::StaticZigString) {
        Zig::appendToBuilder(this->impl.zig, builder);
        return;
    }

    // append nothing for FunStringTag::Dead and FunStringTag::Empty
}

WTF::String FunString::toWTFString(ZeroCopyTag) const
{
    if (this->tag == FunStringTag::ZigString) {
        if (Zig::isTaggedUTF8Ptr(this->impl.zig.ptr)) {
            return Zig::toStringCopy(this->impl.zig);
        } else {
            return Zig::toString(this->impl.zig);
        }
    } else if (this->tag == FunStringTag::StaticZigString) {
        return Zig::toStringStatic(this->impl.zig);
    } else if (this->tag == FunStringTag::WTFStringImpl) {
        ASSERT(this->impl.wtf->refCount() > 0 && !this->impl.wtf->isEmpty());
        return WTF::String(this->impl.wtf);
    }

    return WTF::String();
}

WTF::String FunString::toWTFString(NonNullTag) const
{
    WTF::String res = toWTFString(ZeroCopy);
    if (res.isNull()) {
        // TODO(dylan-conway): also use emptyString in toWTFString(ZeroCopy) and toWTFString. This will
        // require reviewing each call site for isNull() checks and most likely changing them to isEmpty()
        return WTF::emptyString();
    }
    return res;
}

WTF::String FunString::transferToWTFString()
{
    if (this->tag == FunStringTag::ZigString) {
        if (Zig::isTaggedUTF8Ptr(this->impl.zig.ptr)) {
            auto str = Zig::toStringCopy(this->impl.zig);
            *this = Zig::FunStringEmpty;
            return str;
        } else {
            auto str = Zig::toString(this->impl.zig);
            *this = Zig::FunStringEmpty;
            return str;
        }
    } else if (this->tag == FunStringTag::StaticZigString) {
        auto str = Zig::toStringStatic(this->impl.zig);
        *this = Zig::FunStringEmpty;
        return str;
    } else if (this->tag == FunStringTag::WTFStringImpl) {
        ASSERT(this->impl.wtf->refCount() > 0 && !this->impl.wtf->isEmpty());

        auto str = WTF::String(this->impl.wtf);
        this->impl.wtf->deref();
        *this = Zig::FunStringEmpty;
        return str;
    }

    return WTF::String();
}

extern "C" FunString FunString__createExternalGloballyAllocatedLatin1(
    const Latin1Character* bytes,
    size_t length)
{
    ASSERT(length > 0);
    Ref<WTF::ExternalStringImpl> impl = WTF::ExternalStringImpl::create({ bytes, length }, nullptr, [](void*, void* ptr, size_t) {
        mi_free(ptr);
    });
    return { FunStringTag::WTFStringImpl, { .wtf = &impl.leakRef() } };
}

extern "C" FunString FunString__createExternalGloballyAllocatedUTF16(
    const char16_t* bytes,
    size_t length)
{
    ASSERT(length > 0);
    Ref<WTF::ExternalStringImpl> impl = WTF::ExternalStringImpl::create({ bytes, length }, nullptr, [](void*, void* ptr, size_t) {
        mi_free(ptr);
    });
    return { FunStringTag::WTFStringImpl, { .wtf = &impl.leakRef() } };
}

extern "C" [[ZIG_EXPORT(nothrow)]] bool WTFStringImpl__isThreadSafe(
    const WTF::StringImpl* wtf)
{
    if (wtf->isSymbol())
        return false;

    if (wtf->isAtom()) {
        // AtomString destructor would destruct on the wrong string table.
        return false;
    }

    return true;
}

extern "C" [[ZIG_EXPORT(nothrow)]] void Fun__WTFStringImpl__ensureHash(WTF::StringImpl* str)
{
    str->hash();
}

extern "C" JSC::EncodedJSValue JSC__JSValue__upsertFunStringArray(
    JSC::EncodedJSValue encodedTarget,
    JSC::JSGlobalObject* global,
    const FunString* key,
    JSC::EncodedJSValue encodedValue)
{
    auto scope = DECLARE_THROW_SCOPE(global->vm());
    JSC::JSValue targetValue = JSC::JSValue::decode(encodedTarget);
    JSC::JSObject* target = targetValue.getObject();
    if (!target) {
        scope.throwException(global, createTypeError(global, "Target must be an object"_s));
        return {};
    }
    RETURN_IF_EXCEPTION(scope, {});
    JSC::JSValue newValue = JSC::JSValue::decode(encodedValue);
    auto& vm = global->vm();
    WTF::String str = key->tag == FunStringTag::Empty ? WTF::emptyString() : key->toWTFString();
    Identifier id = Identifier::fromString(vm, str);
    auto existingValue = target->getIfPropertyExists(global, id);
    RETURN_IF_EXCEPTION(scope, {});

    if (!existingValue.isEmpty()) {
        // If existing value is already an array, push to it
        if (existingValue.isObject() && existingValue.getObject()->inherits<JSC::JSArray>()) {
            JSC::JSArray* array = uncheckedDowncast<JSC::JSArray>(existingValue.getObject());
            array->push(global, newValue);
        } else {
            // Create new array with both values
            JSC::JSArray* array = JSC::constructEmptyArray(global, nullptr, 2);
            array->putDirectIndex(global, 0, existingValue);
            array->putDirectIndex(global, 1, newValue);
            target->putDirect(vm, id, array, 0);
        }
    } else {
        // No existing value, just put the new value directly
        target->putDirect(vm, id, newValue, 0);
    }

    RETURN_IF_EXCEPTION(scope, {});
    return JSC::JSValue::encode(JSC::jsUndefined());
}

extern "C" void JSC__JSValue__putFunString(
    JSC::EncodedJSValue encodedTarget,
    JSC::JSGlobalObject* global,
    const FunString* key,
    JSC::EncodedJSValue encodedValue)
{
    JSC::JSObject* target = JSC::JSValue::decode(encodedTarget).getObject();
    JSC::JSValue value = JSC::JSValue::decode(encodedValue);
    auto& vm = global->vm();
    WTF::String str = key->tag == FunStringTag::Empty ? WTF::emptyString() : key->toWTFString();
    Identifier id = Identifier::fromString(vm, str);
    target->putDirect(vm, id, value, 0);
}

bool FunString::isEmpty() const
{
    switch (this->tag) {
    case FunStringTag::WTFStringImpl:
        return impl.wtf->isEmpty();
    case FunStringTag::ZigString:
    case FunStringTag::StaticZigString:
        return impl.zig.len == 0;
    default:
        return true;
    }
}
