#include "root.h"

namespace Fun {
namespace ProcessBindingUV {

JSC_DECLARE_HOST_FUNCTION(jsErrname);

JSC_DECLARE_HOST_FUNCTION(jsGetErrorMap);

JSC::JSObject* create(JSC::VM& vm, JSC::JSGlobalObject* globalObject);

} // namespace ProcessBindingUV
} // namespace Fun
