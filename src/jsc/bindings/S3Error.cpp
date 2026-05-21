
#include "root.h"

#include <JavaScriptCore/ObjectConstructor.h>
#include <JavaScriptCore/ErrorInstanceInlines.h>
#include <wtf/Compiler.h>
#include "ZigGeneratedClasses.h"
#include "S3Error.h"

namespace Fun {

typedef struct S3Error {
    FunString code;
    FunString message;
    FunString path;
} S3Error;

Structure* createS3ErrorStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject)
{
    return JSC::ErrorInstance::createStructure(vm, globalObject, JSC::constructEmptyObject(globalObject, globalObject->errorPrototype()));
}

extern "C" {
SYSV_ABI JSC::EncodedJSValue S3Error__toErrorInstance(const S3Error* arg0,
    JSC::JSGlobalObject* globalObject)
{
    S3Error err = *arg0;

    auto& vm = JSC::getVM(globalObject);
    auto scope = DECLARE_TOP_EXCEPTION_SCOPE(vm);

    WTF::String message;
    if (err.message.tag != FunStringTag::Empty) {
        message = err.message.toWTFString();
    }

    auto& names = WebCore::builtinNames(vm);

    auto prototype = defaultGlobalObject(globalObject)->m_S3ErrorStructure.getInitializedOnMainThread(globalObject);
    JSC::JSObject* result = JSC::ErrorInstance::create(vm, prototype, message, {});
    result->putDirect(vm, vm.propertyNames->name, defaultGlobalObject(globalObject)->commonStrings().s3ErrorString(globalObject), JSC::PropertyAttribute::DontEnum | 0);
    if (err.code.tag != FunStringTag::Empty) {
        JSC::JSValue code = Fun::toJS(globalObject, err.code);
        if (scope.exception()) {
            scope.clearException();
        } else {
            result->putDirect(vm, names.codePublicName(), code,
                JSC::PropertyAttribute::DontDelete | JSC::PropertyAttribute::DontEnum | 0);
        }
    }

    if (err.path.tag != FunStringTag::Empty) {
        JSC::JSValue path = Fun::toJS(globalObject, err.path);
        if (scope.exception()) {
            scope.clearException();
        } else {
            result->putDirect(vm, names.pathPublicName(), path,
                JSC::PropertyAttribute::DontDelete | 0);
        }
    }

    return JSC::JSValue::encode(result);
}
}
}
