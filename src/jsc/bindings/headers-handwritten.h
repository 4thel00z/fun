#pragma once
#include "wtf/Compiler.h"
#include "wtf/text/OrdinalNumber.h"
#include "JavaScriptCore/JSCJSValue.h"
#include "JavaScriptCore/ArgList.h"
#include <set>

#ifndef HEADERS_HANDWRITTEN
#define HEADERS_HANDWRITTEN
typedef uint16_t ZigErrorCode;
typedef struct VirtualMachine VirtualMachine;
// exists to make headers.h happy
typedef struct CppWebSocket CppWebSocket;

namespace WTF {
class String;
}

typedef struct ZigString {
    const unsigned char* ptr;
    size_t len;
} ZigString;

#ifndef __cplusplus
typedef uint8_t FunStringTag;
typedef union FunStringImpl {
    ZigString zig;
    void* wtf;
} FunStringImpl;

#else
namespace WTF {
class StringImpl;
class String;
}

typedef union FunStringImpl {
    ZigString zig;
    WTF::StringImpl* wtf;
} FunStringImpl;

enum class FunStringTag : uint8_t {
    Dead = 0,
    WTFStringImpl = 1,
    ZigString = 2,
    StaticZigString = 3,
    Empty = 4,
};

/// Mirrors `fun.uws.ResponseKind` in src/uws_sys/uws.zig.
enum class UWSResponseKind : int32_t {
    TCP = 0,
    SSL = 1,
    H3 = 2,
};
#endif

typedef struct FunString {
    FunStringTag tag;
    FunStringImpl impl;

    enum ZeroCopyTag { ZeroCopy };
    enum NonNullTag { NonNull };

    // If it's not a WTFStringImpl, this does nothing
    inline void ref();

    // If it's not a WTFStringImpl, this does nothing
    inline void deref();

    static size_t utf8ByteLength(const WTF::String&);

    // Zero copy is kind of a lie.
    // We clone it if it's non-ASCII UTF-8.
    // We don't clone it if it was marked as static
    // if it was a ZigString, it still allocates a WTF::StringImpl.
    // It's only truly zero-copy if it was already a WTFStringImpl (which it is if it came from JS and we didn't use ZigString)
    WTF::String toWTFString(ZeroCopyTag) const;

    // If the string is empty, this will ensure m_impl is non-null by
    // using shared static emptyString.
    WTF::String toWTFString(NonNullTag) const;

    WTF::String transferToWTFString();

    // This one usually will clone the raw bytes.
    WTF::String toWTFString() const;

    bool isEmpty() const;

    void appendToBuilder(WTF::StringBuilder& builder) const;

} FunString;

typedef struct ZigErrorType {
    ZigErrorCode code;
    JSC::EncodedJSValue value;
} ZigErrorType;
typedef union ErrorableZigStringResult {
    ZigString value;
    ZigErrorType err;
} ErrorableZigStringResult;
typedef struct ErrorableZigString {
    ErrorableZigStringResult result;
    bool success;
} ErrorableZigString;
typedef union ErrorableStringResult {
    FunString value;
    ZigErrorType err;
} ErrorableStringResult;
typedef struct ErrorableString {
    ErrorableStringResult result;
    bool success;
} ErrorableString;
typedef struct ResolvedSource {
    FunString specifier;
    FunString source_code;
    FunString source_url;
    bool isCommonJSModule;
    JSC::EncodedJSValue cjsCustomExtension;
    void* allocator;
    JSC::EncodedJSValue jsvalue_for_export;
    uint32_t tag;
    bool needsDeref;
    bool already_bundled;
    // -- Bytecode cache fields --
    uint8_t* bytecode_cache;
    size_t bytecode_cache_size;
    void* module_info;
    // File path used as source origin for bytecode cache validation.
    // Converted to file:// URL. If empty, origin is derived from source_url.
    FunString bytecode_origin_path;
} ResolvedSource;
static const uint32_t ResolvedSourceTagPackageJSONTypeModule = 1;
typedef union ErrorableResolvedSourceResult {
    ResolvedSource value;
    ZigErrorType err;
} ErrorableResolvedSourceResult;
typedef struct ErrorableResolvedSource {
    ErrorableResolvedSourceResult result;
    bool success;
} ErrorableResolvedSource;

typedef struct SystemError {
    int errno_;
    FunString code;
    FunString message;
    FunString path;
    FunString syscall;
    FunString hostname;
    /// MinInt if not specified
    int fd;
    FunString dest;
} SystemError;

typedef void* ArrayBufferSink;

typedef uint8_t FunPluginTarget;
const FunPluginTarget FunPluginTargetFun = 0;
const FunPluginTarget FunPluginTargetBrowser = 1;
const FunPluginTarget FunPluginTargetNode = 2;
const FunPluginTarget FunPluginTargetMax = FunPluginTargetNode;

typedef uint8_t ZigStackFrameCode;
const ZigStackFrameCode ZigStackFrameCodeNone = 0;
const ZigStackFrameCode ZigStackFrameCodeEval = 1;
const ZigStackFrameCode ZigStackFrameCodeModule = 2;
const ZigStackFrameCode ZigStackFrameCodeFunction = 3;
const ZigStackFrameCode ZigStackFrameCodeGlobal = 4;
const ZigStackFrameCode ZigStackFrameCodeWasm = 5;
const ZigStackFrameCode ZigStackFrameCodeConstructor = 6;

extern "C" void __attribute((__noreturn__)) Fun__panic(const char* message, size_t length);
#define FUN_PANIC(message) Fun__panic(message, sizeof(message) - 1)

typedef struct ZigStackFramePosition {
    int32_t line_zero_based;
    int32_t column_zero_based;
    int32_t byte_position;

    ALWAYS_INLINE WTF::OrdinalNumber column()
    {
        return OrdinalNumber::fromZeroBasedInt(this->column_zero_based);
    }
    ALWAYS_INLINE WTF::OrdinalNumber line()
    {
        return OrdinalNumber::fromZeroBasedInt(this->line_zero_based);
    }
} ZigStackFramePosition;

typedef struct ZigStackFrame {
    FunString function_name;
    FunString source_url;
    ZigStackFramePosition position;
    ZigStackFrameCode code_type;
    bool is_async;
    bool remapped;
    int32_t jsc_stack_frame_index;

    ZigStackFrame()
        : function_name {}
        , source_url {}
        , position {}
        , code_type {}
        , is_async(false)
        , remapped(false)
        , jsc_stack_frame_index(-1)
    {
    }
} ZigStackFrame;

typedef struct ZigStackTrace {
    FunString* source_lines_ptr;
    OrdinalNumber* source_lines_numbers;
    uint8_t source_lines_len;
    uint8_t source_lines_to_collect;
    ZigStackFrame* frames_ptr;
    uint8_t frames_len;
    uint8_t frames_cap;
    JSC::SourceProvider* referenced_source_provider;
} ZigStackTrace;

typedef struct ZigException {
    unsigned char type;
    uint16_t runtime_type;
    int errno_;
    FunString syscall;
    FunString system_code;
    FunString path;
    FunString name;
    FunString message;
    ZigStackTrace stack;
    void* exception;
    bool remapped;
    int fd;
} ZigException;

typedef uint8_t JSErrorCode;
const JSErrorCode JSErrorCodeError = 0;
const JSErrorCode JSErrorCodeEvalError = 1;
const JSErrorCode JSErrorCodeRangeError = 2;
const JSErrorCode JSErrorCodeReferenceError = 3;
const JSErrorCode JSErrorCodeSyntaxError = 4;
const JSErrorCode JSErrorCodeTypeError = 5;
const JSErrorCode JSErrorCodeURIError = 6;
const JSErrorCode JSErrorCodeAggregateError = 7;
const JSErrorCode JSErrorCodeOutOfMemoryError = 8;
const JSErrorCode JSErrorCodeStackOverflow = 253;
const JSErrorCode JSErrorCodeUserErrorCode = 254;

// Must be kept in sync with fun.schema.api.Loader in schema.zig
typedef uint8_t FunLoaderType;
const FunLoaderType FunLoaderTypeNone = 254;
const FunLoaderType FunLoaderTypeJSX = 1;
const FunLoaderType FunLoaderTypeJS = 2;
const FunLoaderType FunLoaderTypeTS = 3;
const FunLoaderType FunLoaderTypeTSX = 4;
const FunLoaderType FunLoaderTypeCSS = 5;
const FunLoaderType FunLoaderTypeFILE = 6;
const FunLoaderType FunLoaderTypeJSON = 7;
const FunLoaderType FunLoaderTypeJSONC = 8;
const FunLoaderType FunLoaderTypeTOML = 9;
const FunLoaderType FunLoaderTypeWASM = 10;
const FunLoaderType FunLoaderTypeNAPI = 11;
const FunLoaderType FunLoaderTypeYAML = 19;
const FunLoaderType FunLoaderTypeMD = 20;

#pragma mark - Stream

typedef uint8_t Encoding;
const Encoding Encoding__utf8 = 0;
const Encoding Encoding__ucs2 = 1;
const Encoding Encoding__utf16le = 2;
const Encoding Encoding__latin1 = 3;
const Encoding Encoding__ascii = 4;
const Encoding Encoding__base64 = 5;
const Encoding Encoding__base64url = 6;
const Encoding Encoding__hex = 7;
const Encoding Encoding__buffer = 8;

typedef uint8_t WritableEvent;
const WritableEvent WritableEvent__Close = 0;
const WritableEvent WritableEvent__Drain = 1;
const WritableEvent WritableEvent__Error = 2;
const WritableEvent WritableEvent__Finish = 3;
const WritableEvent WritableEvent__Pipe = 4;
const WritableEvent WritableEvent__Unpipe = 5;
const WritableEvent WritableEvent__Open = 6;
const WritableEvent WritableEventUser = 254;

typedef uint8_t ReadableEvent;

const ReadableEvent ReadableEvent__Close = 0;
const ReadableEvent ReadableEvent__Data = 1;
const ReadableEvent ReadableEvent__End = 2;
const ReadableEvent ReadableEvent__Error = 3;
const ReadableEvent ReadableEvent__Pause = 4;
const ReadableEvent ReadableEvent__Readable = 5;
const ReadableEvent ReadableEvent__Resume = 6;
const ReadableEvent ReadableEvent__Open = 7;
const ReadableEvent ReadableEventUser = 254;

#ifndef STRING_POINTER
#define STRING_POINTER
typedef struct StringPointer {
    uint32_t off;
    uint32_t len;
} StringPointer;
#endif

typedef void WebSocketHTTPClient;
typedef void WebSocketHTTPSClient;
typedef void WebSocketClient;
typedef void WebSocketClientTLS;

#ifndef __cplusplus
typedef struct Fun__ArrayBuffer Fun__ArrayBuffer;
typedef struct JSC::JSUint8Array JSC::JSUint8Array;
#endif

#ifdef __cplusplus

extern "C" void Fun__WTFStringImpl__deref(WTF::StringImpl* impl);
extern "C" void Fun__WTFStringImpl__ref(WTF::StringImpl* impl);
extern "C" bool FunString__fromJS(JSC::JSGlobalObject*, JSC::EncodedJSValue, FunString*);
extern "C" JSC::EncodedJSValue FunString__toJS(JSC::JSGlobalObject*, const FunString*);
extern "C" void FunString__toWTFString(FunString*);

namespace Fun {
JSC::JSString* toJS(JSC::JSGlobalObject*, FunString);
FunString toString(JSC::JSGlobalObject* globalObject, JSC::JSValue value);
FunString toString(const char* bytes, size_t length);
FunString toString(WTF::String& wtfString);
FunString toString(const WTF::String& wtfString);
FunString toString(WTF::StringImpl* wtfString);

FunString toStringRef(JSC::JSGlobalObject* globalObject, JSC::JSValue value);
FunString toStringRef(WTF::String& wtfString);
FunString toStringRef(const WTF::String& wtfString);
FunString toStringRef(WTF::StringImpl* wtfString);

// This creates a detached string view, which cannot be ref/unref.
// Be very careful using this, and ensure the memory owner does not get destroyed.
FunString toStringView(WTF::StringView view);
}

typedef struct {
    char* ptr;
    size_t len;
    size_t byte_len;
    int64_t _value;
    uint8_t cell_type;
    bool shared;
    bool resizable;
} Fun__ArrayBuffer;

#include "SyntheticModuleType.h"

extern "C" const char* Fun__userAgent;

extern "C" ZigErrorCode Zig_ErrorCodeParserError;

extern "C" void ZigString__free(const unsigned char* ptr, size_t len, void* allocator);

extern "C" bool Fun__transpileVirtualModule(
    JSC::JSGlobalObject* global,
    const FunString* specifier,
    const FunString* referrer,
    ZigString* sourceCode,
    FunLoaderType loader,
    ErrorableResolvedSource* result);

extern "C" JSC::EncodedJSValue Fun__runVirtualModule(
    JSC::JSGlobalObject* global,
    const FunString* specifier);

extern "C" JSC::JSPromise* Fun__transpileFile(
    void* funVM,
    JSC::JSGlobalObject* global,
    FunString* specifier,
    FunString* referrer,
    const FunString* typeAttribute,
    ErrorableResolvedSource* result,
    bool allowPromise,
    bool isCommonJSRequire,
    FunLoaderType forceLoaderType);

extern "C" bool Fun__fetchBuiltinModule(
    void* funVM,
    JSC::JSGlobalObject* global,
    const FunString* specifier,
    const FunString* referrer,
    ErrorableResolvedSource* result);
extern "C" bool Fun__resolveAndFetchBuiltinModule(
    void* funVM,
    const FunString* specifier,
    ErrorableResolvedSource* result);
extern "C" bool Fun__VM__useIsolationSourceProviderCache(void* funVM);

// Used in process.version
extern "C" const char* Fun__version;
extern "C" const char* Fun__version_with_sha;

// Version exports removed - now handled by CMake-generated header (fun_dependency_versions.h)
// Only keep the ones still exported from Zig
extern "C" const char* Fun__versions_uws;
extern "C" const char* Fun__versions_usockets;

extern "C" const char* Fun__version_sha;

extern "C" void ZigString__freeGlobal(const unsigned char* ptr, size_t len);

extern "C" size_t Fun__encoding__writeLatin1(const unsigned char* ptr, size_t len, unsigned char* to, size_t other_len, Encoding encoding);
extern "C" size_t Fun__encoding__writeUTF16(const char16_t* ptr, size_t len, unsigned char* to, size_t other_len, Encoding encoding);

extern "C" size_t Fun__encoding__byteLengthLatin1AsUTF8(const unsigned char* ptr, size_t len);
extern "C" size_t Fun__encoding__byteLengthUTF16AsUTF8(const char16_t* ptr, size_t len);

extern "C" JSC::EncodedJSValue Fun__encoding__constructFromLatin1(void*, const unsigned char* ptr, size_t len, Encoding encoding);
extern "C" JSC::EncodedJSValue Fun__encoding__constructFromUTF16(void*, const char16_t* ptr, size_t len, Encoding encoding);

extern "C" void Fun__EventLoop__runCallback1(JSC::JSGlobalObject* global, JSC::EncodedJSValue callback, JSC::EncodedJSValue thisValue, JSC::EncodedJSValue arg1);
extern "C" void Fun__EventLoop__runCallback2(JSC::JSGlobalObject* global, JSC::EncodedJSValue callback, JSC::EncodedJSValue thisValue, JSC::EncodedJSValue arg1, JSC::EncodedJSValue arg2);
extern "C" void Fun__EventLoop__runCallback3(JSC::JSGlobalObject* global, JSC::EncodedJSValue callback, JSC::EncodedJSValue thisValue, JSC::EncodedJSValue arg1, JSC::EncodedJSValue arg2, JSC::EncodedJSValue arg3);

/// @note throws a JS exception and returns false if a stack overflow occurs
template<bool isStrict, bool enableAsymmetricMatchers>
bool Fun__deepEquals(JSC::JSGlobalObject* globalObject, JSC::JSValue v1, JSC::JSValue v2, JSC::MarkedArgumentBuffer&, Vector<std::pair<JSC::JSValue, JSC::JSValue>, 16>& stack, JSC::ThrowScope& scope, bool addToStack);

/**
 * @brief `Fun.deepMatch(a, b)`
 *
 * `object` and `subset` must be objects. In the future we should change the
 * signature of this function to only take `JSC::JSCell`. For now, panics
 * if either `object` or `subset` are not `JSCCell`.
 *
 * @note
 * The sets recording already visited properties (`seenObjProperties` and
 * `seenSubsetProperties`) aren not needed when both `enableAsymmetricMatchers`
 * and `isMatchingObjectContaining` are true. In this case, it is safe to pass a
 * `nullptr`.
 *
 * `gcBuffer` ensures JSC's stack scan does not come up empty-handed and free
 * properties currently within those stacks. Likely unnecessary, but better to
 * be safe tnan sorry
 *
 *
 * @tparam enableAsymmetricMatchers
 * @param objValue
 * @param seenObjProperties already visited properties of `objValue`.
 * @param subsetValue
 * @param seenSubsetProperties already visited properties of `subsetValue`.
 * @param globalObject
 * @param Scope
 * @param gcBuffer
 * @param replacePropsWithAsymmetricMatchers
 * @param isMatchingObjectContaining
 *
 * @return true
 * @return false
 */
template<bool enableAsymmetricMatchers>
bool Fun__deepMatch(
    JSC::JSValue object,
    std::set<JSC::EncodedJSValue>* seenObjProperties,
    JSC::JSValue subset,
    std::set<JSC::EncodedJSValue>* seenSubsetProperties,
    JSC::JSGlobalObject* globalObject,
    JSC::ThrowScope& throwScope,
    JSC::MarkedArgumentBuffer* gcBuffer,
    bool replacePropsWithAsymmetricMatchers,
    bool isMatchingObjectContaining);

extern "C" void Fun__remapStackFramePositions(void*, ZigStackFrame*, size_t);

namespace Inspector {
class ScriptArguments;
}

using ScriptArguments = Inspector::ScriptArguments;

ALWAYS_INLINE void FunString::ref()
{
    if (this->tag == FunStringTag::WTFStringImpl) {
        this->impl.wtf->ref();
    }
}
ALWAYS_INLINE void FunString::deref()
{
    if (this->tag == FunStringTag::WTFStringImpl) {
        this->impl.wtf->deref();
    }
}

#define CLEAR_IF_EXCEPTION(scope__) (void)scope__.tryClearException();

#endif // __cplusplus
#endif // HEADERS_HANDWRITTEN

#if ASSERT_ENABLED
#define ASSERT_NO_PENDING_EXCEPTION(globalObject) DECLARE_TOP_EXCEPTION_SCOPE(globalObject->vm()).assertNoExceptionExceptTermination()
#else
#define ASSERT_NO_PENDING_EXCEPTION(globalObject) void()
#endif

#if ASSERT_ENABLED
#define ASSERT_PENDING_EXCEPTION(globalObject) EXCEPTION_ASSERT(!!DECLARE_TOP_EXCEPTION_SCOPE(globalObject->vm()).exception());
#else
#define ASSERT_PENDING_EXCEPTION(globalObject) void()
#endif
