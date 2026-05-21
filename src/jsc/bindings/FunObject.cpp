#include "root.h"

#include "JavaScriptCore/HeapProfiler.h"
#include <JavaScriptCore/HeapSnapshotBuilder.h>
#include "ZigGlobalObject.h"
#include "JavaScriptCore/ArgList.h"
#include "JSDOMURL.h"
#include "helpers.h"
#include "IDLTypes.h"
#include "DOMURL.h"
#include <JavaScriptCore/JSPromise.h>
#include <JavaScriptCore/JSBase.h>
#include <JavaScriptCore/BuiltinNames.h>
#include "ScriptExecutionContext.h"
#include "WebCoreJSClientData.h"
#include <JavaScriptCore/JSFunction.h>
#include <JavaScriptCore/InternalFunction.h>
#include <JavaScriptCore/LazyClassStructure.h>
#include <JavaScriptCore/LazyClassStructureInlines.h>
#include <JavaScriptCore/FunctionPrototype.h>
#include <JavaScriptCore/DateInstance.h>
#include <JavaScriptCore/JSONObject.h>
#include "wtf/SIMDUTF.h"
#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/JSObjectInlines.h>
#include "headers.h"
#include "FunObject.h"
#include "WebCoreJSBuiltins.h"
#include <JavaScriptCore/JSObject.h>
#include "DOMJITIDLConvert.h"
#include "DOMJITIDLType.h"
#include "DOMJITIDLTypeFilter.h"
#include "Exception.h"
#include "JSDOMException.h"
#include "JSDOMConvert.h"
#include "wtf/Compiler.h"
#include "PathInlines.h"
#include "wtf/text/ASCIILiteral.h"
#include "FunObject+exports.h"
#include "ErrorCode.h"
#include "GeneratedFunObject.h"
#include "JavaScriptCore/BunV8HeapSnapshotBuilder.h"
#include "FunObjectModule.h"
#include "JSCookie.h"
#include "JSCookieMap.h"
#include "Secrets.h"

#ifdef WIN32
#include <ws2def.h>
#else
#include <netdb.h>
#endif

extern "C" size_t Fun__Feature__heap_snapshot;

FUN_DECLARE_HOST_FUNCTION(Fun__DNS__lookup);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolve);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveSrv);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveTxt);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveSoa);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveNaptr);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveMx);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveCaa);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveNs);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolvePtr);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveCname);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__resolveAny);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__getServers);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__setServers);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__reverse);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__lookupService);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__prefetch);
FUN_DECLARE_HOST_FUNCTION(Fun__DNS__getCacheStats);
FUN_DECLARE_HOST_FUNCTION(Fun__DNSResolver__new);
FUN_DECLARE_HOST_FUNCTION(Fun__DNSResolver__cancel);
FUN_DECLARE_HOST_FUNCTION(Fun__fetch);
FUN_DECLARE_HOST_FUNCTION(Fun__fetchPreconnect);
FUN_DECLARE_HOST_FUNCTION(Fun__randomUUIDv7);
FUN_DECLARE_HOST_FUNCTION(Fun__randomUUIDv5);

#include "sliceAnsi.h"

namespace Fun {
JSC_DECLARE_HOST_FUNCTION(jsFunctionFunStripANSI);
JSC_DECLARE_HOST_FUNCTION(jsFunctionFunWrapAnsi);
}

using namespace JSC;
using namespace WebCore;

namespace Fun {

extern "C" bool has_fun_garbage_collector_flag_enabled;

static JSValue FunObject_lazyPropCb_wrap_ArrayBufferSink(VM& vm, JSObject* funObject)
{
    return uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject())->ArrayBufferSink();
}

static JSValue constructCookieObject(VM& vm, JSObject* funObject);
static JSValue constructCookieMapObject(VM& vm, JSObject* funObject);
static JSValue constructSecretsObject(VM& vm, JSObject* funObject);
static JSValue constructWebViewObject(VM& vm, JSObject* funObject);

static JSValue constructEnvObject(VM& vm, JSObject* object)
{
    return uncheckedDowncast<Zig::GlobalObject>(object->globalObject())->processEnvObject();
}

static inline JSC::EncodedJSValue flattenArrayOfBuffersIntoArrayBufferOrUint8Array(JSGlobalObject* lexicalGlobalObject, JSValue arrayValue, size_t maxLength, bool asUint8Array)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);

    if (arrayValue.isUndefinedOrNull() || !arrayValue) {
        return JSC::JSValue::encode(JSC::JSArrayBuffer::create(vm, lexicalGlobalObject->arrayBufferStructure(), JSC::ArrayBuffer::create(static_cast<size_t>(0), 1)));
    }

    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto array = dynamicDowncast<JSC::JSArray>(arrayValue);
    if (!array) [[unlikely]] {
        throwTypeError(lexicalGlobalObject, throwScope, "Argument must be an array"_s);
        return {};
    }

    const auto returnEmptyArrayBufferView = [&]() -> EncodedJSValue {
        if (asUint8Array) {
            RELEASE_AND_RETURN(throwScope, JSValue::encode(JSC::JSUint8Array::create(lexicalGlobalObject, lexicalGlobalObject->m_typedArrayUint8.get(lexicalGlobalObject), 0)));
        }

        RELEASE_AND_RETURN(throwScope, JSValue::encode(JSC::JSArrayBuffer::create(vm, lexicalGlobalObject->arrayBufferStructure(), JSC::ArrayBuffer::create(static_cast<size_t>(0), 1))));
    };

    // Resolve every element of the input array into a MarkedArgumentBuffer
    // first so that all user-observable side effects (index getters) run to
    // completion before we read any byte lengths or allocate the output
    // buffer. This avoids a TOCTOU where a getter at index N detaches or
    // resizes the buffer backing index M < N after M's length was measured,
    // which previously left uninitialized bytes in the output.
    MarkedArgumentBuffer args;
    args.ensureCapacity(array->length());
    if (args.hasOverflowed()) [[unlikely]] {
        throwOutOfMemoryError(lexicalGlobalObject, throwScope);
        return {};
    }

    JSC::forEachInArrayLike(lexicalGlobalObject, array, [&](JSValue element) -> bool {
        args.append(element);
        return true;
    });
    RETURN_IF_EXCEPTION(throwScope, {});
    if (args.hasOverflowed()) [[unlikely]] {
        throwOutOfMemoryError(lexicalGlobalObject, throwScope);
        return {};
    }

    // All user code is done running. Validate each element and sum their
    // byte lengths. Nothing between here and the final memcpy loop can call
    // back into JavaScript, so the lengths we measure now are the lengths we
    // copy below.
    size_t byteLength = 0;
    bool any_buffer = false;
    bool any_typed = false;

    for (size_t i = 0; i < args.size(); i++) {
        JSValue element = args.at(i);
        if (auto* typedArray = dynamicDowncast<JSC::JSArrayBufferView>(element)) {
            if (typedArray->isDetached()) [[unlikely]] {
                return Fun::ERR::INVALID_STATE(throwScope, lexicalGlobalObject, "Cannot validate on a detached buffer"_s);
            }
            any_typed = true;
            byteLength += typedArray->byteLength();
        } else if (auto* arrayBuffer = dynamicDowncast<JSC::JSArrayBuffer>(element)) {
            auto* impl = arrayBuffer->impl();
            if (!impl || impl->isDetached()) [[unlikely]] {
                return Fun::ERR::INVALID_STATE(throwScope, lexicalGlobalObject, "Cannot validate on a detached buffer"_s);
            }
            any_buffer = true;
            byteLength += impl->byteLength();
        } else {
            throwTypeError(lexicalGlobalObject, throwScope, "Expected TypedArray"_s);
            return {};
        }
    }
    byteLength = std::min(byteLength, maxLength);

    if (byteLength == 0) {
        return returnEmptyArrayBufferView();
    }

    auto buffer = JSC::ArrayBuffer::tryCreateUninitialized(byteLength, 1);
    if (!buffer) [[unlikely]] {
        throwTypeError(lexicalGlobalObject, throwScope, "Failed to allocate ArrayBuffer"_s);
        return {};
    }

    size_t remain = byteLength;
    auto* head = reinterpret_cast<char*>(buffer->data());

    if (!any_buffer) {
        for (size_t i = 0; i < args.size() && remain > 0; i++) {
            auto* view = uncheckedDowncast<JSC::JSArrayBufferView>(args.at(i));
            size_t length = std::min(remain, view->byteLength());
            if (length > 0)
                memcpy(head, view->vector(), length);
            remain -= length;
            head += length;
        }
    } else if (!any_typed) {
        for (size_t i = 0; i < args.size() && remain > 0; i++) {
            auto* view = uncheckedDowncast<JSC::JSArrayBuffer>(args.at(i));
            size_t length = std::min(remain, view->impl()->byteLength());
            if (length > 0)
                memcpy(head, view->impl()->data(), length);
            remain -= length;
            head += length;
        }
    } else {
        for (size_t i = 0; i < args.size() && remain > 0; i++) {
            auto element = args.at(i);
            size_t length = 0;
            if (auto* view = dynamicDowncast<JSC::JSArrayBuffer>(element)) {
                length = std::min(remain, view->impl()->byteLength());
                if (length > 0)
                    memcpy(head, view->impl()->data(), length);
            } else {
                auto* typedArray = uncheckedDowncast<JSC::JSArrayBufferView>(element);
                length = std::min(remain, typedArray->byteLength());
                if (length > 0)
                    memcpy(head, typedArray->vector(), length);
            }
            remain -= length;
            head += length;
        }
    }

    ASSERT(remain == 0);

    if (asUint8Array) {
        auto uint8array = JSC::JSUint8Array::create(lexicalGlobalObject, lexicalGlobalObject->m_typedArrayUint8.get(lexicalGlobalObject), WTF::move(buffer), 0, byteLength);
        RETURN_IF_EXCEPTION(throwScope, {});
        return JSValue::encode(uint8array);
    }

    RELEASE_AND_RETURN(throwScope, JSValue::encode(JSC::JSArrayBuffer::create(vm, lexicalGlobalObject->arrayBufferStructure(), WTF::move(buffer))));
}

JSC_DEFINE_HOST_FUNCTION(functionConcatTypedArrays, (JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    if (callFrame->argumentCount() < 1) [[unlikely]] {
        throwTypeError(globalObject, throwScope, "Expected at least one argument"_s);
        return {};
    }

    auto arrayValue = callFrame->uncheckedArgument(0);

    size_t maxLength = std::numeric_limits<size_t>::max();
    auto arg1 = callFrame->argument(1);
    if (!arg1.isUndefined() && arg1.isNumber()) {
        double number = arg1.toNumber(globalObject);
        if (std::isnan(number) || number < 0) {
            throwRangeError(globalObject, throwScope, "Maximum length must be >= 0"_s);
            return {};
        }
        if (!std::isinf(number)) {
            maxLength = arg1.toUInt32(globalObject);
        }
    }

    bool asUint8Array = false;
    auto arg2 = callFrame->argument(2);
    if (!arg2.isUndefined()) {
        asUint8Array = arg2.toBoolean(globalObject);
    }

    RELEASE_AND_RETURN(throwScope, flattenArrayOfBuffersIntoArrayBufferOrUint8Array(globalObject, arrayValue, maxLength, asUint8Array));
}

JSC_DECLARE_HOST_FUNCTION(functionConcatTypedArrays);

static JSValue constructFunVersion(VM& vm, JSObject*)
{
    return JSC::jsString(vm, makeString(ASCIILiteral::fromLiteralUnsafe(Fun__version + 1)));
}

static JSValue constructFunRevision(VM& vm, JSObject*)
{
    return JSC::jsString(vm, makeString(ASCIILiteral::fromLiteralUnsafe(Fun__version_sha)));
}

static JSValue constructFunVersionWithSha(VM& vm, JSObject*)
{
    return JSC::jsString(vm, makeString(ASCIILiteral::fromLiteralUnsafe(Fun__version_with_sha)));
}

static JSValue constructIsMainThread(VM&, JSObject* object)
{
    return jsBoolean(uncheckedDowncast<Zig::GlobalObject>(object->globalObject())->scriptExecutionContext()->isMainThread());
}

static JSValue constructPluginObject(VM& vm, JSObject* funObject)
{
    auto* globalObject = funObject->globalObject();
    JSFunction* pluginFunction = JSFunction::create(vm, globalObject, 1, String("plugin"_s), jsFunctionFunPlugin, ImplementationVisibility::Public, NoIntrinsic);
    pluginFunction->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "clearAll"_s), 1, jsFunctionFunPluginClear, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);

    return pluginFunction;
}

static JSValue defaultFunSQLObject(VM& vm, JSObject* funObject)
{
    auto scope = DECLARE_THROW_SCOPE(vm);
    auto* globalObject = defaultGlobalObject(funObject->globalObject());
    JSValue sqlValue = globalObject->internalModuleRegistry()->requireId(globalObject, vm, InternalModuleRegistry::FunSql);
#if FUN_DEBUG
    if (scope.exception()) globalObject->reportUncaughtExceptionAtEventLoop(globalObject, scope.exception());
#endif
    RETURN_IF_EXCEPTION(scope, {});
    RELEASE_AND_RETURN(scope, sqlValue.getObject()->get(globalObject, vm.propertyNames->defaultKeyword));
}

static JSValue constructFunSQLObject(VM& vm, JSObject* funObject)
{
    auto scope = DECLARE_THROW_SCOPE(vm);
    auto* globalObject = defaultGlobalObject(funObject->globalObject());
    JSValue sqlValue = globalObject->internalModuleRegistry()->requireId(globalObject, vm, InternalModuleRegistry::FunSql);
#if FUN_DEBUG
    if (scope.exception()) globalObject->reportUncaughtExceptionAtEventLoop(globalObject, scope.exception());
#endif
    RETURN_IF_EXCEPTION(scope, {});
    auto clientData = WebCore::clientData(vm);
    RELEASE_AND_RETURN(scope, sqlValue.getObject()->get(globalObject, clientData->builtinNames().SQLPublicName()));
}

extern "C" JSC::EncodedJSValue JSPasswordObject__create(JSGlobalObject*);

static JSValue constructPasswordObject(VM& vm, JSObject* funObject)
{
    return JSValue::decode(JSPasswordObject__create(funObject->globalObject()));
}

JSValue constructFunFetchObject(VM& vm, JSObject* funObject)
{
    JSFunction* fetchFn = JSFunction::create(vm, funObject->globalObject(), 1, "fetch"_s, Fun__fetch, ImplementationVisibility::Public, NoIntrinsic);

    auto* globalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    fetchFn->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "preconnect"_s), 1, Fun__fetchPreconnect, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontDelete | 0);

    return fetchFn;
}

static JSValue constructFunShell(VM& vm, JSObject* funObject)
{
    auto* globalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    JSFunction* createParsedShellScript = JSFunction::create(vm, funObject->globalObject(), 2, "createParsedShellScript"_s, FunObject_callback_createParsedShellScript, ImplementationVisibility::Private, NoIntrinsic);
    JSFunction* createShellInterpreterFunction = JSFunction::create(vm, funObject->globalObject(), 1, "createShellInterpreter"_s, FunObject_callback_createShellInterpreter, ImplementationVisibility::Private, NoIntrinsic);
    JSC::JSFunction* createShellFn = JSC::JSFunction::create(vm, globalObject, shellCreateFunShellTemplateFunctionCodeGenerator(vm), globalObject);

    auto scope = DECLARE_THROW_SCOPE(vm);
    auto args = JSC::MarkedArgumentBuffer();
    args.append(createShellInterpreterFunction);
    args.append(createParsedShellScript);
    JSC::JSValue shell = JSC::call(globalObject, createShellFn, args, "FunShell"_s);
    RETURN_IF_EXCEPTION(scope, {});

    if (!shell.isObject()) [[unlikely]] {
        throwTypeError(globalObject, scope, "Internal error: FunShell constructor did not return an object"_s);
        return {};
    }

    auto* funShell = shell.getObject();

    auto ShellError = funShell->get(globalObject, JSC::Identifier::fromString(vm, "ShellError"_s));
    RETURN_IF_EXCEPTION(scope, {});
    if (!ShellError.isObject()) [[unlikely]] {
        throwTypeError(globalObject, scope, "Internal error: FunShell.ShellError is not an object"_s);
        return {};
    }

    funShell->putDirectNativeFunction(vm, globalObject, Identifier::fromString(vm, "braces"_s), 1, Generated::FunObject::jsBraces, ImplementationVisibility::Public, NoIntrinsic, JSC::PropertyAttribute::DontDelete | JSC::PropertyAttribute::ReadOnly | 0);
    funShell->putDirectNativeFunction(vm, globalObject, Identifier::fromString(vm, "escape"_s), 1, FunObject_callback_shellEscape, ImplementationVisibility::Public, NoIntrinsic, JSC::PropertyAttribute::DontDelete | JSC::PropertyAttribute::ReadOnly | 0);
    funShell->putDirect(vm, JSC::Identifier::fromString(vm, "ShellError"_s), ShellError.getObject(), JSC::PropertyAttribute::DontDelete | JSC::PropertyAttribute::ReadOnly | 0);

    return funShell;
}

static JSValue constructDNSObject(VM& vm, JSObject* funObject)
{
    JSGlobalObject* globalObject = funObject->globalObject();
    JSC::JSObject* dnsObject = JSC::constructEmptyObject(globalObject);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "lookup"_s), 2, Fun__DNS__lookup, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, vm.propertyNames->resolve, 2, Fun__DNS__resolve, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveSrv"_s), 2, Fun__DNS__resolveSrv, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveTxt"_s), 2, Fun__DNS__resolveTxt, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveSoa"_s), 2, Fun__DNS__resolveSoa, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveNaptr"_s), 2, Fun__DNS__resolveNaptr, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveMx"_s), 2, Fun__DNS__resolveMx, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveCaa"_s), 2, Fun__DNS__resolveCaa, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveNs"_s), 2, Fun__DNS__resolveNs, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolvePtr"_s), 2, Fun__DNS__resolvePtr, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveCname"_s), 2, Fun__DNS__resolveCname, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "resolveAny"_s), 2, Fun__DNS__resolveAny, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "getServers"_s), 2, Fun__DNS__getServers, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "setServers"_s), 2, Fun__DNS__setServers, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "reverse"_s), 2, Fun__DNS__reverse, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "lookupService"_s), 2, Fun__DNS__lookupService, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "prefetch"_s), 2, Fun__DNS__prefetch, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "getCacheStats"_s), 0, Fun__DNS__getCacheStats, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirect(vm, JSC::Identifier::fromString(vm, "ADDRCONFIG"_s), jsNumber(AI_ADDRCONFIG),
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirect(vm, JSC::Identifier::fromString(vm, "ALL"_s), jsNumber(AI_ALL),
        JSC::PropertyAttribute::DontDelete | 0);
    dnsObject->putDirect(vm, JSC::Identifier::fromString(vm, "V4MAPPED"_s), jsNumber(AI_V4MAPPED),
        JSC::PropertyAttribute::DontDelete | 0);
    return dnsObject;
}

JSC_DECLARE_HOST_FUNCTION(jsFunctionJSONLParse);
JSC_DECLARE_HOST_FUNCTION(jsFunctionJSONLParseChunk);

JSC_DEFINE_HOST_FUNCTION(jsFunctionJSONLParse, (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue arg = callFrame->argument(0);
    if (arg.isUndefinedOrNull()) {
        throwTypeError(globalObject, scope, "JSONL.parse requires a string argument"_s);
        return {};
    }

    MarkedArgumentBuffer values;
    JSC::StreamingJSONParseResult result;

    if (arg.isCell() && isTypedArrayType(arg.asCell()->type())) {
        auto* view = uncheckedDowncast<JSC::JSArrayBufferView>(arg.asCell());
        if (view->isDetached()) {
            throwTypeError(globalObject, scope, "ArrayBuffer is detached"_s);
            return {};
        }
        auto* data = static_cast<const uint8_t*>(view->vector());
        size_t length = view->byteLength();

        // Skip UTF-8 BOM if present
        if (length >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF) {
            data += 3;
            length -= 3;
        }

        if (length <= String::MaxLength && simdutf::validate_ascii(reinterpret_cast<const char*>(data), length)) {
            auto chars = std::span { reinterpret_cast<const char8_t*>(data), length };
            result = JSC::streamingJSONParse(globalObject, StringView(chars), values);
        } else {
            size_t u16Length = simdutf::utf16_length_from_utf8(reinterpret_cast<const char*>(data), length);
            if (u16Length > String::MaxLength) {
                throwOutOfMemoryError(globalObject, scope);
                return {};
            }
            auto str = WTF::String::fromUTF8ReplacingInvalidSequences(std::span { reinterpret_cast<const char8_t*>(data), length });
            if (str.isNull()) {
                throwOutOfMemoryError(globalObject, scope);
                return {};
            }
            result = JSC::streamingJSONParse(globalObject, str, values);
        }
    } else {
        auto* inputString = arg.toString(globalObject);
        RETURN_IF_EXCEPTION(scope, {});
        auto view = inputString->view(globalObject);
        RETURN_IF_EXCEPTION(scope, {});
        result = JSC::streamingJSONParse(globalObject, view, values);
    }

    RETURN_IF_EXCEPTION(scope, {});

    if (result.status == JSC::StreamingJSONParseResult::Status::Error && values.isEmpty()) {
        throwSyntaxError(globalObject, scope, "Failed to parse JSONL"_s);
        return {};
    }

    RELEASE_AND_RETURN(scope, JSValue::encode(constructArray(globalObject, static_cast<ArrayAllocationProfile*>(nullptr), values)));
}

JSC_DEFINE_HOST_FUNCTION(jsFunctionJSONLParseChunk, (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    VM& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue arg = callFrame->argument(0);
    if (arg.isUndefinedOrNull()) {
        throwTypeError(globalObject, scope, "JSONL.parseChunk requires a string argument"_s);
        return {};
    }

    MarkedArgumentBuffer values;
    JSC::StreamingJSONParseResult result;
    size_t readBytes = 0;
    bool isTypedArray = arg.isCell() && isTypedArrayType(arg.asCell()->type());

    // Apply optional start/end offsets (byte offsets for typed arrays, character offsets for strings).
    // Populates start/end clamped to [0, length], with start <= end.
    size_t start;
    size_t end;
    const auto parseOffsets = [&](size_t length) {
        start = 0;
        end = length;

        JSValue startArg = callFrame->argument(1);
        if (startArg.isNumber()) {
            double s = startArg.asNumber();
            if (s > 0)
                start = static_cast<size_t>(std::min(s, static_cast<double>(length)));
        }

        JSValue endArg = callFrame->argument(2);
        if (endArg.isNumber()) {
            double e = endArg.asNumber();
            if (e >= 0)
                end = static_cast<size_t>(std::min(e, static_cast<double>(length)));
        }

        if (start > end)
            start = end;
    };

    if (isTypedArray) {
        auto* view = uncheckedDowncast<JSC::JSArrayBufferView>(arg.asCell());
        if (view->isDetached()) {
            throwTypeError(globalObject, scope, "ArrayBuffer is detached"_s);
            return {};
        }
        auto* data = static_cast<const uint8_t*>(view->vector());
        size_t length = view->byteLength();
        parseOffsets(length);

        const uint8_t* sliceData = data + start;
        size_t sliceLen = end - start;

        // Skip UTF-8 BOM if present at the start of the slice
        size_t bomOffset = 0;
        if (start == 0 && sliceLen >= 3 && sliceData[0] == 0xEF && sliceData[1] == 0xBB && sliceData[2] == 0xBF) {
            sliceData += 3;
            sliceLen -= 3;
            bomOffset = 3;
        }

        if (sliceLen <= String::MaxLength && simdutf::validate_ascii(reinterpret_cast<const char*>(sliceData), sliceLen)) {
            auto chars = std::span { reinterpret_cast<const char8_t*>(sliceData), sliceLen };
            result = JSC::streamingJSONParse(globalObject, StringView(chars), values);
            // For ASCII, byte offset = character offset
            readBytes = start + bomOffset + result.charactersConsumed;
        } else {
            size_t u16Length = simdutf::utf16_length_from_utf8(reinterpret_cast<const char*>(sliceData), sliceLen);
            if (u16Length > String::MaxLength) {
                throwOutOfMemoryError(globalObject, scope);
                return {};
            }
            auto str = WTF::String::fromUTF8ReplacingInvalidSequences(std::span { reinterpret_cast<const char8_t*>(sliceData), sliceLen });
            if (str.isNull()) {
                throwOutOfMemoryError(globalObject, scope);
                return {};
            }
            result = JSC::streamingJSONParse(globalObject, str, values);
            // Convert character offset back to UTF-8 byte offset
            if (str.is8Bit()) {
                readBytes = start + bomOffset + simdutf::utf8_length_from_latin1(reinterpret_cast<const char*>(str.span8().data()), result.charactersConsumed);
            } else {
                readBytes = start + bomOffset + simdutf::utf8_length_from_utf16le(reinterpret_cast<const char16_t*>(str.span16().data()), result.charactersConsumed);
            }
        }
    } else {
        auto* inputString = arg.toString(globalObject);
        RETURN_IF_EXCEPTION(scope, {});
        auto view = inputString->view(globalObject);
        RETURN_IF_EXCEPTION(scope, {});

        size_t length = view->length();
        parseOffsets(length);

        if (start != 0 || end != length) {
            result = JSC::streamingJSONParse(globalObject, view->substring(start, end - start), values);
        } else {
            result = JSC::streamingJSONParse(globalObject, view, values);
        }
        readBytes = start + result.charactersConsumed;
    }

    RETURN_IF_EXCEPTION(scope, {});

    JSArray* array = constructArray(globalObject, static_cast<ArrayAllocationProfile*>(nullptr), values);
    RETURN_IF_EXCEPTION(scope, {});

    JSValue errorValue = jsNull();
    if (result.status == JSC::StreamingJSONParseResult::Status::Error) {
        errorValue = createSyntaxError(globalObject, "Failed to parse JSONL"_s);
    }

    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(globalObject);
    JSObject* resultObj = constructEmptyObject(vm, zigGlobalObject->jsonlParseResultStructure());
    resultObj->putDirectOffset(vm, 0, array);
    resultObj->putDirectOffset(vm, 1, jsNumber(readBytes));
    resultObj->putDirectOffset(vm, 2, jsBoolean(result.status == JSC::StreamingJSONParseResult::Status::Complete));
    resultObj->putDirectOffset(vm, 3, errorValue);

    return JSValue::encode(resultObj);
}

static JSValue constructJSONLObject(VM& vm, JSObject* funObject)
{
    JSGlobalObject* globalObject = funObject->globalObject();
    JSC::JSObject* jsonlObject = JSC::constructEmptyObject(globalObject);
    jsonlObject->putDirectNativeFunction(vm, globalObject, vm.propertyNames->parse, 1, jsFunctionJSONLParse, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    jsonlObject->putDirectNativeFunction(vm, globalObject, JSC::Identifier::fromString(vm, "parseChunk"_s), 1, jsFunctionJSONLParseChunk, ImplementationVisibility::Public, NoIntrinsic,
        JSC::PropertyAttribute::DontDelete | 0);
    jsonlObject->putDirect(vm, vm.propertyNames->toStringTagSymbol, jsNontrivialString(vm, "JSONL"_s),
        JSC::PropertyAttribute::DontEnum | JSC::PropertyAttribute::ReadOnly);
    return jsonlObject;
}

static JSValue constructFunPeekObject(VM& vm, JSObject* funObject)
{
    JSGlobalObject* globalObject = funObject->globalObject();
    JSC::Identifier identifier = JSC::Identifier::fromString(vm, "peek"_s);
    JSFunction* peekFunction = JSFunction::create(vm, globalObject, peekPeekCodeGenerator(vm), globalObject->globalScope());
    JSFunction* peekStatus = JSFunction::create(vm, globalObject, peekPeekStatusCodeGenerator(vm), globalObject->globalScope());
    peekFunction->putDirect(vm, PropertyName(JSC::Identifier::fromString(vm, "status"_s)), peekStatus, JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontDelete | 0);

    return peekFunction;
}

extern "C" uint64_t Fun__readOriginTimer(void*);
extern "C" double Fun__readOriginTimerStart(void*);
static JSC_DECLARE_JIT_OPERATION_WITHOUT_WTF_INTERNAL(functionFunEscapeHTMLWithoutTypeCheck, JSC::EncodedJSValue, (JSC::JSGlobalObject*, JSObject*, JSString*));

JSC_DEFINE_HOST_FUNCTION(functionFunSleep,
    (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);

    JSC::JSValue millisecondsValue = callFrame->argument(0);

    if (millisecondsValue.inherits<JSC::DateInstance>()) {
        auto now = MonotonicTime::now();
        double milliseconds = uncheckedDowncast<JSC::DateInstance>(millisecondsValue)->internalNumber() - now.approximate<WTF::WallTime>().secondsSinceEpoch().milliseconds();
        millisecondsValue = JSC::jsNumber(milliseconds > 0 ? std::ceil(milliseconds) : 0);
    }

    if (!millisecondsValue.isNumber()) {
        auto scope = DECLARE_THROW_SCOPE(globalObject->vm());
        JSC::throwTypeError(globalObject, scope, "sleep expects a number (milliseconds)"_s);
        return {};
    }

    JSC::JSPromise* promise = JSC::JSPromise::create(vm, globalObject->promiseStructure());
    Fun__Timer__sleep(globalObject, JSValue::encode(promise), JSC::JSValue::encode(millisecondsValue));
    return JSC::JSValue::encode(promise);
}

extern "C" JSC::EncodedJSValue Fun__escapeHTML8(JSGlobalObject* globalObject, JSC::EncodedJSValue input, const Latin1Character* ptr, size_t length);
extern "C" JSC::EncodedJSValue Fun__escapeHTML16(JSGlobalObject* globalObject, JSC::EncodedJSValue input, const char16_t* ptr, size_t length);

JSC_DEFINE_HOST_FUNCTION(functionFunEscapeHTML, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    JSC::JSValue argument = callFrame->argument(0);
    if (argument.isEmpty())
        return JSValue::encode(jsEmptyString(vm));
    if (argument.isNumber() || argument.isBoolean() || argument.isUndefined() || argument.isNull())
        return JSValue::encode(argument.toString(lexicalGlobalObject));

    auto scope = DECLARE_THROW_SCOPE(vm);
    auto string = argument.toString(lexicalGlobalObject);
    RETURN_IF_EXCEPTION(scope, {});
    if (string->length() == 0)
        RELEASE_AND_RETURN(scope, JSValue::encode(string));

    auto resolvedString = string->view(lexicalGlobalObject);
    RETURN_IF_EXCEPTION(scope, {});

    JSC::EncodedJSValue encodedInput = JSValue::encode(string);
    if (!resolvedString->is8Bit()) {
        const auto span = resolvedString->span16();
        RELEASE_AND_RETURN(scope, Fun__escapeHTML16(lexicalGlobalObject, encodedInput, span.data(), span.size()));
    } else {
        const auto span = resolvedString->span8();
        RELEASE_AND_RETURN(scope, Fun__escapeHTML8(lexicalGlobalObject, encodedInput, span.data(), span.size()));
    }
}

JSC_DEFINE_HOST_FUNCTION(functionFunDeepEquals, (JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto* global = reinterpret_cast<GlobalObject*>(globalObject);
    auto& vm = JSC::getVM(global);

    auto scope = DECLARE_THROW_SCOPE(vm);

    if (callFrame->argumentCount() < 2) {
        auto throwScope = DECLARE_THROW_SCOPE(vm);
        throwTypeError(globalObject, throwScope, "Expected 2 values to compare"_s);
        return {};
    }

    JSC::JSValue arg1 = callFrame->uncheckedArgument(0);
    JSC::JSValue arg2 = callFrame->uncheckedArgument(1);
    JSC::JSValue strict = callFrame->argument(2);

    Vector<std::pair<JSValue, JSValue>, 16> stack;
    MarkedArgumentBuffer gcBuffer;

    if (strict.isBoolean() && strict.asBoolean()) {

        bool isEqual = Fun__deepEquals<true, false>(globalObject, arg1, arg2, gcBuffer, stack, scope, true);
        RETURN_IF_EXCEPTION(scope, {});
        return JSValue::encode(jsBoolean(isEqual));
    } else {
        bool isEqual = Fun__deepEquals<false, false>(globalObject, arg1, arg2, gcBuffer, stack, scope, true);
        RETURN_IF_EXCEPTION(scope, {});
        return JSValue::encode(jsBoolean(isEqual));
    }
}

JSC_DEFINE_HOST_FUNCTION(functionFunDeepMatch, (JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto* global = reinterpret_cast<GlobalObject*>(globalObject);
    auto& vm = JSC::getVM(global);

    auto scope = DECLARE_THROW_SCOPE(vm);

    if (callFrame->argumentCount() < 2) {
        throwTypeError(globalObject, scope, "Expected 2 values to compare"_s);
        return {};
    }

    JSC::JSValue subset = callFrame->uncheckedArgument(0);
    JSC::JSValue object = callFrame->uncheckedArgument(1);

    if (!subset.isObject() || !object.isObject()) {
        throwTypeError(globalObject, scope, "Expected 2 objects to match"_s);
        return {};
    }

    std::set<EncodedJSValue> objVisited;
    std::set<EncodedJSValue> subsetVisited;
    MarkedArgumentBuffer gcBuffer;
    bool match = Fun__deepMatch</* enableAsymmetricMatchers */ false>(object, &objVisited, subset, &subsetVisited, globalObject, scope, &gcBuffer, false, false);
    RETURN_IF_EXCEPTION(scope, {});
    return JSValue::encode(jsBoolean(match));
}

JSC_DEFINE_HOST_FUNCTION(functionFunNanoseconds, (JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    uint64_t time = Fun__readOriginTimer(funVM(globalObject));
    return JSValue::encode(jsNumber(time));
}

JSC_DEFINE_HOST_FUNCTION(functionPathToFileURL, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::CallFrame* callFrame))
{
    auto& globalObject = *defaultGlobalObject(lexicalGlobalObject);
    auto& vm = globalObject.vm();
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto pathValue = callFrame->argument(0);

    JSValue jsValue;

    {
        WTF::String pathString = pathValue.toWTFString(lexicalGlobalObject);
        RETURN_IF_EXCEPTION(throwScope, {});
        pathString = pathResolveWTFString(lexicalGlobalObject, pathString);

        auto fileURL = WTF::URL::fileURLWithFileSystemPath(pathString);
        auto object = WebCore::DOMURL::create(fileURL.string(), String());
        jsValue = WebCore::toJSNewlyCreated<IDLInterface<DOMURL>>(*lexicalGlobalObject, globalObject, throwScope, WTF::move(object));
    }

    RETURN_IF_EXCEPTION(throwScope, {});
    auto* jsDOMURL = uncheckedDowncast<JSDOMURL>(jsValue.asCell());
    vm.heap.reportExtraMemoryAllocated(jsDOMURL, jsDOMURL->wrapped().memoryCostForGC());
    RELEASE_AND_RETURN(throwScope, JSC::JSValue::encode(jsValue));
}

JSC_DEFINE_HOST_FUNCTION(functionGenerateHeapSnapshot, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    vm.ensureHeapProfiler();
    auto& heapProfiler = *vm.heapProfiler();
    heapProfiler.clearSnapshots();

    Fun__Feature__heap_snapshot += 1;

    JSValue arg0 = callFrame->argument(0);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    bool useV8 = false;
    bool useArrayBuffer = false;
    if (!arg0.isUndefined()) {
        if (arg0.isString()) {
            auto str = arg0.toWTFString(globalObject);
            RETURN_IF_EXCEPTION(throwScope, {});
            if (str == "v8"_s) {
                useV8 = true;
            } else if (str == "jsc"_s) {
                // do nothing
            } else {
                throwTypeError(globalObject, throwScope, "Expected 'v8' or 'jsc' or undefined"_s);
                return {};
            }
        }
    }

    if (useV8) {
        JSValue arg1 = callFrame->argument(1);
        if (!arg1.isUndefined()) {
            if (arg1.isString()) {
                auto str = arg1.toWTFString(globalObject);
                RETURN_IF_EXCEPTION(throwScope, {});
                if (str == "arraybuffer"_s) {
                    useArrayBuffer = true;
                } else {
                    throwTypeError(globalObject, throwScope, "Expected 'arraybuffer' or undefined as second argument"_s);
                    return {};
                }
            }
        }

        if (useArrayBuffer) {
            JSC::BunV8HeapSnapshotBuilder builder(heapProfiler);
            auto bytes = builder.jsonBytes();
            auto released = bytes.releaseBuffer();
            auto span = released.leakSpan();
            auto buffer = ArrayBuffer::createFromBytes(std::span<const uint8_t> { span.data(), span.size() }, createSharedTask<void(void*)>([](void* p) {
                fastFree(p);
            }));
            return JSC::JSValue::encode(JSC::JSArrayBuffer::create(vm, globalObject->arrayBufferStructure(), WTF::move(buffer)));
        }

        JSC::BunV8HeapSnapshotBuilder builder(heapProfiler);
        return JSC::JSValue::encode(jsString(vm, builder.json()));
    }

    JSC::HeapSnapshotBuilder builder(heapProfiler);
    builder.buildSnapshot();
    auto json = builder.json();
    // Returning an object was a bad idea but it's a breaking change
    // so we'll just keep it for now.
    JSC::JSValue jsonValue = JSONParseWithException(globalObject, json);
    RELEASE_AND_RETURN(throwScope, JSC::JSValue::encode(jsonValue));
}

JSC_DEFINE_HOST_FUNCTION(functionFileURLToPath, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);
    JSValue arg0 = callFrame->argument(0);
    WTF::URL url;

    auto path = JSC::JSValue::encode(arg0);
    auto* domURL = WebCoreCast<WebCore::JSDOMURL, WebCore::DOMURL>(path);
    if (!domURL) {
        if (arg0.isString()) {
            url = WTF::URL(arg0.toWTFString(globalObject));
            RETURN_IF_EXCEPTION(scope, {});
        } else {
            Fun::ERR::INVALID_ARG_TYPE(scope, globalObject, "url"_s, "string"_s, arg0);
            return {};
        }
    } else {
        url = domURL->href();
    }

    /// cannot turn non-`file://` URLs into file paths
    if (!url.protocolIsFile()) [[unlikely]] {
        Fun::ERR::INVALID_URL_SCHEME(scope, globalObject, "file"_s);
        return {};
    }

// NOTE: On Windows, WTF::URL::fileSystemPath will handle UNC paths
// (`file:\\server\share\etc` -> `\\server\share\etc`), so hostname check only
// needs to happen on posix systems
#if !OS(WINDOWS)
    // file://host/path is illegal if `host` is not `localhost`.
    // Should be `file:///` instead
    if (url.host().length() > 0 && url.host() != "localhost"_s) [[unlikely]] {

#if OS(DARWIN)
        Fun::ERR::INVALID_FILE_URL_HOST(scope, globalObject, "darwin"_s);
        return {};
#else
        Fun::ERR::INVALID_FILE_URL_HOST(scope, globalObject, "linux"_s);
        return {};
#endif
    }
#endif

    // ban url-encoded slashes. '/' on posix, '/' and '\' on windows.
    const StringView p = url.path();
    if (p.contains('%')) {
#if OS(WINDOWS)
        if (p.contains("%2f"_s) || p.contains("%5c"_s) || p.contains("%2F"_s) || p.contains("%5C"_s)) {
            Fun::ERR::INVALID_FILE_URL_PATH(scope, globalObject, "must not include encoded \\ or / characters"_s);
            return {};
        }
#else
        if (p.contains("%2f"_s) || p.contains("%2F"_s)) {
            Fun::ERR::INVALID_FILE_URL_PATH(scope, globalObject, "must not include encoded / characters"_s);
            return {};
        }
#endif
    }

    auto fileSystemPath = url.fileSystemPath();

#if OS(WINDOWS)
    if (!isAbsolutePath(fileSystemPath)) {
        Fun::ERR::INVALID_FILE_URL_PATH(scope, globalObject, "must be an absolute path"_s);
        return {};
    }
#endif

    return JSC::JSValue::encode(JSC::jsString(vm, fileSystemPath));
}

/* Source for FunObject.lut.h
@begin funObjectTable
    $                                              constructFunShell                                                   DontDelete|PropertyCallback
    Archive                                        FunObject_lazyPropCb_wrap_Archive                                   DontDelete|PropertyCallback
    ArrayBufferSink                                FunObject_lazyPropCb_wrap_ArrayBufferSink                           DontDelete|PropertyCallback
    Cookie                                         constructCookieObject                                               DontDelete|ReadOnly|PropertyCallback
    CookieMap                                      constructCookieMapObject                                            DontDelete|ReadOnly|PropertyCallback
    CryptoHasher                                   FunObject_lazyPropCb_wrap_CryptoHasher                              DontDelete|PropertyCallback
    FFI                                            FunObject_lazyPropCb_wrap_FFI                                       DontDelete|PropertyCallback
    FileSystemRouter                               FunObject_lazyPropCb_wrap_FileSystemRouter                          DontDelete|PropertyCallback
    Glob                                           FunObject_lazyPropCb_wrap_Glob                                      DontDelete|PropertyCallback
    Image                                          FunObject_lazyPropCb_wrap_Image                                     DontDelete|PropertyCallback
    MD4                                            FunObject_lazyPropCb_wrap_MD4                                       DontDelete|PropertyCallback
    MD5                                            FunObject_lazyPropCb_wrap_MD5                                       DontDelete|PropertyCallback
    SHA1                                           FunObject_lazyPropCb_wrap_SHA1                                      DontDelete|PropertyCallback
    SHA224                                         FunObject_lazyPropCb_wrap_SHA224                                    DontDelete|PropertyCallback
    SHA256                                         FunObject_lazyPropCb_wrap_SHA256                                    DontDelete|PropertyCallback
    SHA384                                         FunObject_lazyPropCb_wrap_SHA384                                    DontDelete|PropertyCallback
    SHA512                                         FunObject_lazyPropCb_wrap_SHA512                                    DontDelete|PropertyCallback
    SHA512_256                                     FunObject_lazyPropCb_wrap_SHA512_256                                DontDelete|PropertyCallback
    JSONC                                          FunObject_lazyPropCb_wrap_JSONC                                     DontDelete|PropertyCallback
    JSON5                                          FunObject_lazyPropCb_wrap_JSON5                                     DontDelete|PropertyCallback
    JSONL                                          constructJSONLObject                                                ReadOnly|DontDelete|PropertyCallback
    markdown                                         FunObject_lazyPropCb_wrap_markdown                                  DontDelete|PropertyCallback
    TOML                                           FunObject_lazyPropCb_wrap_TOML                                      DontDelete|PropertyCallback
    YAML                                           FunObject_lazyPropCb_wrap_YAML                                      DontDelete|PropertyCallback
    Transpiler                                     FunObject_lazyPropCb_wrap_Transpiler                                DontDelete|PropertyCallback
    embeddedFiles                                  FunObject_lazyPropCb_wrap_embeddedFiles                             DontDelete|PropertyCallback
    S3Client                                       FunObject_lazyPropCb_wrap_S3Client                                  DontDelete|PropertyCallback
    s3                                             FunObject_lazyPropCb_wrap_s3                                        DontDelete|PropertyCallback
    CSRF                                           FunObject_lazyPropCb_wrap_CSRF                                      DontDelete|PropertyCallback
    allocUnsafe                                    FunObject_callback_allocUnsafe                                      DontDelete|Function 1
    argv                                           FunObject_lazyPropCb_wrap_argv                                      DontDelete|PropertyCallback
    build                                          FunObject_callback_build                                            DontDelete|Function 1
    concatArrayBuffers                             functionConcatTypedArrays                                           DontDelete|Function 3
    connect                                        FunObject_callback_connect                                          DontDelete|Function 1
    cron                                           FunObject_lazyPropCb_wrap_cron                                      DontDelete|PropertyCallback
    cwd                                            FunObject_lazyPropCb_wrap_cwd                                       DontEnum|DontDelete|PropertyCallback
    color                                          FunObject_callback_color                                            DontDelete|Function 2
    deepEquals                                     functionFunDeepEquals                                               DontDelete|Function 2
    deepMatch                                      functionFunDeepMatch                                                DontDelete|Function 2
    deflateSync                                    FunObject_callback_deflateSync                                      DontDelete|Function 1
    dns                                            constructDNSObject                                                  ReadOnly|DontDelete|PropertyCallback
    enableANSIColors                               FunObject_lazyPropCb_wrap_enableANSIColors                          DontDelete|PropertyCallback
    env                                            constructEnvObject                                                  ReadOnly|DontDelete|PropertyCallback
    escapeHTML                                     functionFunEscapeHTML                                               DontDelete|Function 2
    fetch                                          constructFunFetchObject                                             ReadOnly|DontDelete|PropertyCallback
    file                                           FunObject_callback_file                                             DontDelete|Function 1
    fileURLToPath                                  functionFileURLToPath                                               DontDelete|Function 1
    gc                                             Generated::FunObject::jsGc                                          DontDelete|Function 1
    generateHeapSnapshot                           functionGenerateHeapSnapshot                                        DontDelete|Function 2
    gunzipSync                                     FunObject_callback_gunzipSync                                       DontDelete|Function 1
    gzipSync                                       FunObject_callback_gzipSync                                         DontDelete|Function 1
    hash                                           FunObject_lazyPropCb_wrap_hash                                      DontDelete|PropertyCallback
    indexOfLine                                    FunObject_callback_indexOfLine                                      DontDelete|Function 1
    inflateSync                                    FunObject_callback_inflateSync                                      DontDelete|Function 1
    inspect                                        FunObject_lazyPropCb_wrap_inspect                                   DontDelete|PropertyCallback
    isMainThread                                   constructIsMainThread                                               ReadOnly|DontDelete|PropertyCallback
    jest                                           FunObject_callback_jest                                             DontEnum|DontDelete|Function 1
    listen                                         FunObject_callback_listen                                           DontDelete|Function 1
    udpSocket                                      FunObject_callback_udpSocket                                        DontDelete|Function 1
    main                                           funObjectMain                                                       DontDelete|CustomAccessor
    mmap                                           FunObject_callback_mmap                                             DontDelete|Function 1
    nanoseconds                                    functionFunNanoseconds                                              DontDelete|Function 0
    openInEditor                                   FunObject_callback_openInEditor                                     DontDelete|Function 1
    origin                                         FunObject_lazyPropCb_wrap_origin                                    DontEnum|ReadOnly|DontDelete|PropertyCallback
    version_with_sha                               constructFunVersionWithSha                                          DontEnum|ReadOnly|DontDelete|PropertyCallback
    password                                       constructPasswordObject                                             DontDelete|PropertyCallback
    pathToFileURL                                  functionPathToFileURL                                               DontDelete|Function 1
    peek                                           constructFunPeekObject                                              DontDelete|PropertyCallback
    plugin                                         constructPluginObject                                               ReadOnly|DontDelete|PropertyCallback
    randomUUIDv7                                   Fun__randomUUIDv7                                                   DontDelete|Function 2
    randomUUIDv5                                   Fun__randomUUIDv5                                                   DontDelete|Function 3
    readableStreamToArray                          JSBuiltin                                                           Builtin|Function 1
    readableStreamToArrayBuffer                    JSBuiltin                                                           Builtin|Function 1
    readableStreamToBytes                          JSBuiltin                                                           Builtin|Function 1
    readableStreamToBlob                           JSBuiltin                                                           Builtin|Function 1
    readableStreamToFormData                       JSBuiltin                                                           Builtin|Function 1
    readableStreamToJSON                           JSBuiltin                                                           Builtin|Function 1
    readableStreamToText                           JSBuiltin                                                           Builtin|Function 1
    registerMacro                                  FunObject_callback_registerMacro                                    DontEnum|DontDelete|Function 1
    resolve                                        FunObject_callback_resolve                                          DontDelete|Function 1
    resolveSync                                    FunObject_callback_resolveSync                                      DontDelete|Function 1
    revision                                       constructFunRevision                                                ReadOnly|DontDelete|PropertyCallback
    semver                                         FunObject_lazyPropCb_wrap_semver                                    ReadOnly|DontDelete|PropertyCallback
    sql                                            defaultFunSQLObject                                                 DontDelete|PropertyCallback
    postgres                                       defaultFunSQLObject                                                 DontDelete|PropertyCallback
    SQL                                            constructFunSQLObject                                               DontDelete|PropertyCallback
    serve                                          FunObject_callback_serve                                            DontDelete|Function 1
    sha                                            FunObject_callback_sha                                              DontDelete|Function 1
    shrink                                         FunObject_callback_shrink                                           DontDelete|Function 1
    sliceAnsi                                      jsFunctionFunSliceAnsi                                              DontDelete|Function 5
    sleep                                          functionFunSleep                                                    DontDelete|Function 1
    sleepSync                                      FunObject_callback_sleepSync                                        DontDelete|Function 1
    spawn                                          FunObject_callback_spawn                                            DontDelete|Function 1
    spawnSync                                      FunObject_callback_spawnSync                                        DontDelete|Function 1
    stderr                                         FunObject_lazyPropCb_wrap_stderr                                    DontDelete|PropertyCallback
    stdin                                          FunObject_lazyPropCb_wrap_stdin                                     DontDelete|PropertyCallback
    stdout                                         FunObject_lazyPropCb_wrap_stdout                                    DontDelete|PropertyCallback
    stringWidth                                    FunObject_callback_stringWidth                                      DontDelete|Function 2
    stripANSI                                      jsFunctionFunStripANSI                                              DontDelete|Function 1
    wrapAnsi                                       jsFunctionFunWrapAnsi                                               DontDelete|Function 3
    Terminal                                       FunObject_lazyPropCb_wrap_Terminal                                  DontDelete|PropertyCallback
    unsafe                                         FunObject_lazyPropCb_wrap_unsafe                                    DontDelete|PropertyCallback
    version                                        constructFunVersion                                                 ReadOnly|DontDelete|PropertyCallback
    WebView                                        constructWebViewObject                                              ReadOnly|DontDelete|PropertyCallback
    which                                          FunObject_callback_which                                            DontDelete|Function 1
    RedisClient                                    FunObject_lazyPropCb_wrap_ValkeyClient                              DontDelete|PropertyCallback
    redis                                          FunObject_lazyPropCb_wrap_valkey                                    DontDelete|PropertyCallback
    secrets                                        constructSecretsObject                                              DontDelete|PropertyCallback
    write                                          FunObject_callback_write                                            DontDelete|Function 1
    zstdCompressSync                               FunObject_callback_zstdCompressSync                                DontDelete|Function 1
    zstdDecompressSync                             FunObject_callback_zstdDecompressSync                              DontDelete|Function 1
    zstdCompress                                 FunObject_callback_zstdCompress                                    DontDelete|Function 1
    zstdDecompress                                 FunObject_callback_zstdDecompress                                    DontDelete|Function 1
@end
*/

class JSFunObject : public JSC::JSNonFinalObject {
    using Base = JSC::JSNonFinalObject;

public:
    JSFunObject(JSC::VM& vm, JSC::Structure* structure)
        : Base(vm, structure)
    {
    }

    DECLARE_INFO;

    static constexpr JSC::DestructionMode needsDestruction = DoesNotNeedDestruction;
    static constexpr unsigned StructureFlags = Base::StructureFlags | HasStaticPropertyTable;

    template<typename CellType, JSC::SubspaceAccess>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSFunObject, Base);
        return &vm.plainObjectSpace();
    }
    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info());
    }

    void finishCreation(JSC::VM& vm)
    {
        Base::finishCreation(vm);
        JSC_TO_STRING_TAG_WITHOUT_TRANSITION();
    }

    static JSFunObject* create(JSC::VM& vm, JSGlobalObject* globalObject)
    {
        auto structure = createStructure(vm, globalObject, globalObject->objectPrototype());
        auto* object = new (NotNull, JSC::allocateCell<JSFunObject>(vm)) JSFunObject(vm, structure);
        object->finishCreation(vm);
        return object;
    }
};

extern "C" JSC::EncodedJSValue SYSV_ABI FunObject_getter_main(JSC::JSGlobalObject*);
extern "C" bool SYSV_ABI FunObject_setter_main(JSC::JSGlobalObject*, JSC::EncodedJSValue);

static JSC_DEFINE_CUSTOM_GETTER(funObjectMain, (JSC::JSGlobalObject * globalObject, JSC::EncodedJSValue thisEncoded, PropertyName propertyName))
{
    (void)thisEncoded;
    (void)propertyName;
    return FunObject_getter_main(globalObject);
}

static JSC_DEFINE_CUSTOM_SETTER(setFunObjectMain, (JSC::JSGlobalObject * globalObject, JSC::EncodedJSValue thisEncoded, JSC::EncodedJSValue encodedValue, PropertyName propertyName))
{
    (void)thisEncoded;
    (void)propertyName;
    return FunObject_setter_main(globalObject, encodedValue);
}

#define funObjectReadableStreamToArrayCodeGenerator WebCore::readableStreamReadableStreamToArrayCodeGenerator
#define funObjectReadableStreamToArrayBufferCodeGenerator WebCore::readableStreamReadableStreamToArrayBufferCodeGenerator
#define funObjectReadableStreamToBytesCodeGenerator WebCore::readableStreamReadableStreamToBytesCodeGenerator
#define funObjectReadableStreamToBlobCodeGenerator WebCore::readableStreamReadableStreamToBlobCodeGenerator
#define funObjectReadableStreamToFormDataCodeGenerator WebCore::readableStreamReadableStreamToFormDataCodeGenerator
#define funObjectReadableStreamToJSONCodeGenerator WebCore::readableStreamReadableStreamToJSONCodeGenerator
#define funObjectReadableStreamToTextCodeGenerator WebCore::readableStreamReadableStreamToTextCodeGenerator

// LazyProperty wrappers for stdin/stderr/stdout
static JSValue FunObject_lazyPropCb_wrap_stdin(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return zigGlobalObject->m_funStdin.getInitializedOnMainThread(zigGlobalObject);
}

static JSValue FunObject_lazyPropCb_wrap_stderr(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return zigGlobalObject->m_funStderr.getInitializedOnMainThread(zigGlobalObject);
}

static JSValue FunObject_lazyPropCb_wrap_stdout(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return zigGlobalObject->m_funStdout.getInitializedOnMainThread(zigGlobalObject);
}

#include "FunObject.lut.h"

#undef funObjectReadableStreamToArrayCodeGenerator
#undef funObjectReadableStreamToArrayBufferCodeGenerator
#undef funObjectReadableStreamToBytesCodeGenerator
#undef funObjectReadableStreamToBlobCodeGenerator
#undef funObjectReadableStreamToFormDataCodeGenerator
#undef funObjectReadableStreamToJSONCodeGenerator
#undef funObjectReadableStreamToTextCodeGenerator

const JSC::ClassInfo JSFunObject::s_info = { "Fun"_s, &Base::s_info, &funObjectTable, nullptr, CREATE_METHOD_TABLE(JSFunObject) };

static JSValue constructCookieObject(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return WebCore::JSCookie::getConstructor(vm, zigGlobalObject);
}

static JSValue constructCookieMapObject(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return WebCore::JSCookieMap::getConstructor(vm, zigGlobalObject);
}

static JSValue constructSecretsObject(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return Fun::createSecretsObject(vm, zigGlobalObject);
}

static JSValue constructWebViewObject(VM& vm, JSObject* funObject)
{
    auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(funObject->globalObject());
    return zigGlobalObject->m_JSWebViewClassStructure.constructor(zigGlobalObject);
}

JSC::JSObject* createFunObject(VM& vm, JSObject* globalObject)
{
    return JSFunObject::create(vm, uncheckedDowncast<Zig::GlobalObject>(globalObject));
}

static void exportFunObject(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSObject* object, Vector<JSC::Identifier, 4>& exportNames, JSC::MarkedArgumentBuffer& exportValues)
{
    exportNames.reserveCapacity(std::size(funObjectTableValues) + 1);
    exportValues.ensureCapacity(std::size(funObjectTableValues) + 1);

    PropertyNameArrayBuilder propertyNames(vm, PropertyNameMode::Strings, PrivateSymbolMode::Exclude);
    auto scope = DECLARE_THROW_SCOPE(vm);
    object->getOwnNonIndexPropertyNames(globalObject, propertyNames, DontEnumPropertiesMode::Exclude);
    RETURN_IF_EXCEPTION(scope, void());

    exportNames.append(vm.propertyNames->defaultKeyword);
    exportValues.append(object);

    for (const auto& propertyName : propertyNames) {
        exportNames.append(propertyName);
        auto topExceptionScope = DECLARE_TOP_EXCEPTION_SCOPE(vm);

        // Yes, we have to call getters :(
        JSValue value = object->get(globalObject, propertyName);

        if (topExceptionScope.exception()) {
            (void)topExceptionScope.tryClearException();
            value = jsUndefined();
        }
        exportValues.append(value);
    }
}

} // namespace Fun

namespace Zig {
void generateNativeModule_FunObject(JSC::JSGlobalObject* lexicalGlobalObject,
    JSC::Identifier moduleKey,
    Vector<JSC::Identifier, 4>& exportNames,
    JSC::MarkedArgumentBuffer& exportValues)
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    Zig::GlobalObject* globalObject = uncheckedDowncast<Zig::GlobalObject>(lexicalGlobalObject);

    auto scope = DECLARE_THROW_SCOPE(vm);
    auto* object = globalObject->funObject();

    // :'(
    if (object->hasNonReifiedStaticProperties()) [[likely]] {
        object->reifyAllStaticProperties(lexicalGlobalObject);
    }

    RETURN_IF_EXCEPTION(scope, void());

    Fun::exportFunObject(vm, globalObject, object, exportNames, exportValues);
}

} // namespace Zig
