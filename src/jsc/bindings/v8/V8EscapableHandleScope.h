#pragma once

#include "V8EscapableHandleScopeBase.h"

namespace v8 {

class EscapableHandleScope : public EscapableHandleScopeBase {
public:
    FUN_EXPORT EscapableHandleScope(Isolate* isolate);
    FUN_EXPORT ~EscapableHandleScope();

    template<class T>
    Local<T> Escape(Local<T> value)
    {
        if (value.IsEmpty()) return value;
        uintptr_t* escapedSlot = EscapeSlot(value.tagged().asRawPtrLocation());
        return Local<T>(reinterpret_cast<TaggedPointer*>(escapedSlot));
    }
};

static_assert(sizeof(EscapableHandleScope) == 32, "EscapableHandleScope has wrong layout");

} // namespace v8
