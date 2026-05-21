// clang-format off
#include "root.h"
#include "ModuleLoader.h"
#include "headers-handwritten.h"
#include "PathInlines.h"
#include "JSCommonJSModule.h"

#include <JavaScriptCore/JSBoundFunction.h>
#include <JavaScriptCore/PropertySlot.h>
#include <JavaScriptCore/JSMap.h>
#include <JavaScriptCore/JSString.h>
#include <JavaScriptCore/SourceCode.h>

#include "ZigGlobalObject.h"
#include "InternalModuleRegistry.h"

#pragma push_macro("assert")
#undef assert

#define FOREACH_EXPOSED_BUILTIN_IMR(v)     \
    v(ffi,                    Fun::InternalModuleRegistry::FunFFI) \
    v(assert,                 Fun::InternalModuleRegistry::NodeAssert) \
    v(async_hooks,            Fun::InternalModuleRegistry::NodeAsyncHooks) \
    v(child_process,          Fun::InternalModuleRegistry::NodeChildProcess) \
    v(cluster,                Fun::InternalModuleRegistry::NodeCluster) \
    v(dgram,                  Fun::InternalModuleRegistry::NodeDgram) \
    v(diagnostics_channel,    Fun::InternalModuleRegistry::NodeDiagnosticsChannel) \
    v(dns,                    Fun::InternalModuleRegistry::NodeDNS) \
    v(domain,                 Fun::InternalModuleRegistry::NodeDomain) \
    v(events,                 Fun::InternalModuleRegistry::NodeEvents) \
    v(fs,                     Fun::InternalModuleRegistry::NodeFS) \
    v(http,                   Fun::InternalModuleRegistry::NodeHttp) \
    v(http2,                  Fun::InternalModuleRegistry::NodeHttp2) \
    v(https,                  Fun::InternalModuleRegistry::NodeHttps) \
    v(inspector,              Fun::InternalModuleRegistry::NodeInspector) \
    v(net,                    Fun::InternalModuleRegistry::NodeNet) \
    v(os,                     Fun::InternalModuleRegistry::NodeOS) \
    v(path,                   Fun::InternalModuleRegistry::NodePath) \
    v(perf_hooks,             Fun::InternalModuleRegistry::NodePerfHooks) \
    v(punycode,               Fun::InternalModuleRegistry::NodePunycode) \
    v(querystring,            Fun::InternalModuleRegistry::NodeQuerystring) \
    v(readline,               Fun::InternalModuleRegistry::NodeReadline) \
    v(stream,                 Fun::InternalModuleRegistry::NodeStream) \
    v(sys,                    Fun::InternalModuleRegistry::NodeUtil) \
    v(timers,                 Fun::InternalModuleRegistry::NodeTimers) \
    v(tls,                    Fun::InternalModuleRegistry::NodeTLS) \
    v(trace_events,           Fun::InternalModuleRegistry::NodeTraceEvents) \
    v(tty,                    Fun::InternalModuleRegistry::NodeTty) \
    v(url,                    Fun::InternalModuleRegistry::NodeUrl) \
    v(util,                   Fun::InternalModuleRegistry::NodeUtil) \
    v(v8,                     Fun::InternalModuleRegistry::NodeV8) \
    v(vm,                     Fun::InternalModuleRegistry::NodeVM) \
    v(wasi,                   Fun::InternalModuleRegistry::NodeWasi) \
    v(sqlite,                 Fun::InternalModuleRegistry::FunSqlite) \
    v(worker_threads,         Fun::InternalModuleRegistry::NodeWorkerThreads) \
    v(zlib,                   Fun::InternalModuleRegistry::NodeZlib) \
    v(constants,              Fun::InternalModuleRegistry::NodeConstants) \
    v(string_decoder,         Fun::InternalModuleRegistry::NodeStringDecoder) \
    v(buffer,                 Fun::InternalModuleRegistry::NodeBuffer) \
    v(jsc,                    Fun::InternalModuleRegistry::FunJSC) \

namespace ExposeNodeModuleGlobalGetters {

#define DECL_GETTER(id, field) \
    JSC_DEFINE_CUSTOM_GETTER(id, (JSC::JSGlobalObject * lexicalGlobalObject, JSC::EncodedJSValue thisValue, JSC::PropertyName)) \
    { \
        Zig::GlobalObject* thisObject = defaultGlobalObject(lexicalGlobalObject); \
        JSC::VM& vm = thisObject->vm(); \
        return JSC::JSValue::encode(thisObject->internalModuleRegistry()->requireId(thisObject, vm, field)); \
    }
FOREACH_EXPOSED_BUILTIN_IMR(DECL_GETTER)
#undef DECL_GETTER    

} // namespace ExposeNodeModuleGlobalGetters

extern "C" [[ZIG_EXPORT(nothrow)]] void Fun__ExposeNodeModuleGlobals(Zig::GlobalObject* globalObject)
{

    auto& vm = JSC::getVM(globalObject);
#define PUT_CUSTOM_GETTER_SETTER(id, field) \
    globalObject->putDirectCustomAccessor( \
        vm, \
        JSC::Identifier::fromString(vm, #id##_s), \
        JSC::CustomGetterSetter::create( \
            vm, \
            ExposeNodeModuleGlobalGetters::id, \
            nullptr), \
        0 | JSC::PropertyAttribute::CustomValue \
    );

    FOREACH_EXPOSED_BUILTIN_IMR(PUT_CUSTOM_GETTER_SETTER)
#undef PUT_CUSTOM_GETTER_SETTER
}

// Set up require(), module, __filename, __dirname on globalThis for the REPL.
// Creates a CommonJS module object rooted at the given directory so require() resolves correctly.
extern "C" [[ZIG_EXPORT(check_slow)]] void Fun__REPL__setupGlobalRequire(
    Zig::GlobalObject* globalObject,
    const unsigned char* cwdPtr,
    size_t cwdLen)
{
    using namespace JSC;
    auto& vm = getVM(globalObject);
    auto scope = DECLARE_THROW_SCOPE(vm);

    auto cwdStr = WTF::String::fromUTF8(std::span { cwdPtr, cwdLen });
    auto* filename = jsString(vm, makeString(cwdStr, PLATFORM_SEP_s, "[repl]"_s));
    auto* dirname = jsString(vm, WTF::String(cwdStr));

    auto* moduleObject = Fun::JSCommonJSModule::create(vm,
        globalObject->CommonJSModuleObjectStructure(),
        filename, filename, dirname, SourceCode());
    moduleObject->hasEvaluated = true;

    auto* resolveFunction = JSBoundFunction::create(vm, globalObject,
        globalObject->requireResolveFunctionUnbound(), filename,
        ArgList(), 1, globalObject->commonStrings().resolveString(globalObject),
        makeSource("resolve"_s, SourceOrigin(), SourceTaintedOrigin::Untainted));
    RETURN_IF_EXCEPTION(scope, );

    auto* requireFunction = JSBoundFunction::create(vm, globalObject,
        globalObject->requireFunctionUnbound(), moduleObject,
        ArgList(), 1, globalObject->commonStrings().requireString(globalObject),
        makeSource("require"_s, SourceOrigin(), SourceTaintedOrigin::Untainted));
    RETURN_IF_EXCEPTION(scope, );

    requireFunction->putDirect(vm, vm.propertyNames->resolve, resolveFunction, 0);
    moduleObject->putDirect(vm, WebCore::clientData(vm)->builtinNames().requirePublicName(), requireFunction, 0);

    globalObject->putDirect(vm, WebCore::builtinNames(vm).requirePublicName(), requireFunction, 0);
    globalObject->putDirect(vm, Identifier::fromString(vm, "module"_s), moduleObject, 0);
    globalObject->putDirect(vm, Identifier::fromString(vm, "__filename"_s), filename, 0);
    globalObject->putDirect(vm, Identifier::fromString(vm, "__dirname"_s), dirname, 0);
}

#pragma pop_macro("assert")
