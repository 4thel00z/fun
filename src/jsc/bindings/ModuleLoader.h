#pragma once

#include "root.h"
#include "headers-handwritten.h"

#include <JavaScriptCore/JSCInlines.h>
#include "FunClientData.h"

FUN_DECLARE_HOST_FUNCTION(jsFunctionOnLoadObjectResultResolve);
FUN_DECLARE_HOST_FUNCTION(jsFunctionOnLoadObjectResultReject);
FUN_DECLARE_HOST_FUNCTION(jsFunctionEvictIsolationSourceProviderCache);

namespace Zig {
class GlobalObject;
}

namespace JSC {
class JSPromise;
}

namespace Fun {
using namespace JSC;

class JSCommonJSModule;

typedef uint8_t OnLoadResultType;
const OnLoadResultType OnLoadResultTypeError = 0;
const OnLoadResultType OnLoadResultTypeCode = 1;
const OnLoadResultType OnLoadResultTypeObject = 2;
const OnLoadResultType OnLoadResultTypePromise = 3;

struct CodeString {
    ZigString string;
    JSC::JSValue value;
    FunLoaderType loader;
};

union OnLoadResultValue {
    CodeString sourceText;
    JSC::JSValue object;
    JSC::JSValue promise;
    JSC::JSValue error;
};

struct OnLoadResult {
    OnLoadResultValue value;
    OnLoadResultType type;
    bool wasMock;
};

extern "C" bool isFunTest;

class PendingVirtualModuleResult : public JSC::JSInternalFieldObjectImpl<3> {
public:
    using Base = JSC::JSInternalFieldObjectImpl<3>;

    template<typename, JSC::SubspaceAccess mode> static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        if constexpr (mode == JSC::SubspaceAccess::Concurrently)
            return nullptr;
        return WebCore::subspaceForImpl<PendingVirtualModuleResult, WebCore::UseCustomHeapCellType::No>(
            vm,
            [](auto& spaces) { return spaces.m_clientSubspaceForPendingVirtualModuleResult.get(); },
            [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForPendingVirtualModuleResult = std::forward<decltype(space)>(space); },
            [](auto& spaces) { return spaces.m_subspaceForPendingVirtualModuleResult.get(); },
            [](auto& spaces, auto&& space) { spaces.m_subspaceForPendingVirtualModuleResult = std::forward<decltype(space)>(space); });
    }

    JS_EXPORT_PRIVATE static PendingVirtualModuleResult* create(VM&, Structure*);
    static PendingVirtualModuleResult* create(JSC::JSGlobalObject* globalObject, const WTF::String& specifier, const WTF::String& referrer, bool wasModuleMock);
    static PendingVirtualModuleResult* createWithInitialValues(VM&, Structure*);
    static Structure* createStructure(VM&, JSGlobalObject*, JSValue);

    JSC::JSPromise* internalPromise();

    static std::array<JSValue, numberOfInternalFields> initialValues()
    {
        return { {
            jsUndefined(),
            jsUndefined(),
            jsUndefined(),
        } };
    }

    DECLARE_EXPORT_INFO;
    DECLARE_VISIT_CHILDREN;

    PendingVirtualModuleResult(JSC::VM&, JSC::Structure*);
    void finishCreation(JSC::VM&, const WTF::String& specifier, const WTF::String& referrer);

    bool wasModuleMock = false;
};

JSValue fetchESMSourceCodeSync(
    Zig::GlobalObject* globalObject,
    JSString* spceifierJS,
    ErrorableResolvedSource* res,
    FunString* specifier,
    FunString* referrer,
    FunString* typeAttribute);

JSValue fetchESMSourceCodeAsync(
    Zig::GlobalObject* globalObject,
    JSString* spceifierJS,
    ErrorableResolvedSource* res,
    FunString* specifier,
    FunString* referrer,
    FunString* typeAttribute);

JSValue fetchCommonJSModule(
    Zig::GlobalObject* globalObject,
    JSCommonJSModule* moduleObject,
    JSValue specifierValue,
    String specifier,
    FunString* referrer,
    FunString* typeAttribute);

template<bool isExtension>
JSValue fetchCommonJSModuleNonBuiltin(
    void* funVM,
    JSC::VM& vm,
    Zig::GlobalObject* globalObject,
    FunString* specifier,
    JSC::JSValue specifierValue,
    FunString* referrer,
    FunString* typeAttribute,
    ErrorableResolvedSource* res,
    JSCommonJSModule* target,
    String specifierWtfString,
    FunLoaderType forceLoaderType,
    JSC::ThrowScope& scope);

JSValue resolveAndFetchBuiltinModule(
    Zig::GlobalObject* globalObject,
    FunString* specifier);

JSValue fetchBuiltinModuleWithoutResolution(
    Zig::GlobalObject* globalObject,
    FunString* specifier,
    ErrorableResolvedSource* res);

} // namespace Fun
