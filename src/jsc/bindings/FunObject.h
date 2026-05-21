#pragma once

namespace Fun {

JSC_DECLARE_HOST_FUNCTION(functionFunPeek);
JSC_DECLARE_HOST_FUNCTION(functionFunPeekStatus);
JSC_DECLARE_HOST_FUNCTION(functionFunSleep);
JSC_DECLARE_HOST_FUNCTION(functionFunEscapeHTML);
JSC_DECLARE_HOST_FUNCTION(functionFunDeepEquals);
JSC_DECLARE_HOST_FUNCTION(functionFunDeepMatch);
JSC_DECLARE_HOST_FUNCTION(functionFunNanoseconds);
JSC_DECLARE_HOST_FUNCTION(functionPathToFileURL);
JSC_DECLARE_HOST_FUNCTION(functionFileURLToPath);

JSC::JSValue constructFunFetchObject(VM& vm, JSObject* funObject);
JSC::JSObject* createFunObject(VM& vm, JSObject* globalObject);

JSC::JSObject* FunShell(JSGlobalObject* globalObject);
JSC::JSValue ShellError(JSGlobalObject* globalObject);

}
