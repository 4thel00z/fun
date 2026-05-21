#include "root.h"

namespace Zig {
class GlobalObject;
}

namespace JSC {
class JSValue;
}

namespace Fun {

JSC::JSValue createEnvironmentVariablesMap(Zig::GlobalObject* globalObject);

}
