#pragma once

#include "v8.h"
#include "V8Isolate.h"
#include "V8HandleScope.h"

namespace v8 {

class EscapableHandleScopeBase : public HandleScope {
public:
    FUN_EXPORT EscapableHandleScopeBase(Isolate* isolate);

protected:
    FUN_EXPORT uintptr_t* EscapeSlot(uintptr_t* escape_value);

private:
    shim::Handle* m_escapeSlot;
};

} // namespace v8
