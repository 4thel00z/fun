#include "root.h"

#include "JavaScriptCore/CallData.h"
#include <JavaScriptCore/ObjectConstructor.h>
#include "InternalModuleRegistry.h"
#include "ModuleLoader.h"
#include "ZigGlobalObject.h"
#include <JavaScriptCore/JSPromise.h>
namespace Fun {
using namespace JSC;
extern "C" JSPromise* Fun__loadHTMLEntryPoint(Zig::GlobalObject* globalObject)
{
    auto& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);

    JSValue htmlModule = globalObject->internalModuleRegistry()->requireId(globalObject, vm, InternalModuleRegistry::InternalHtml);
    if (scope.exception()) [[unlikely]] {
        return JSPromise::rejectedPromiseWithCaughtException(globalObject, scope);
    }

    JSObject* htmlModuleObject = htmlModule.getObject();
    if (!htmlModuleObject) [[unlikely]] {
        FUN_PANIC("Failed to load HTML entry point");
    }

    MarkedArgumentBuffer args;
    JSValue result = JSC::call(globalObject, htmlModuleObject, args, "Failed to load HTML entry point"_s);
    if (scope.exception()) [[unlikely]] {
        return JSPromise::rejectedPromiseWithCaughtException(globalObject, scope);
    }

    if (result.isUndefined()) {
        return JSPromise::resolvedPromise(globalObject, result);
    }

    JSPromise* promise = dynamicDowncast<JSC::JSPromise>(result);
    if (!promise) [[unlikely]] {
        FUN_PANIC("Failed to load HTML entry point");
    }
    return promise;
}

}
