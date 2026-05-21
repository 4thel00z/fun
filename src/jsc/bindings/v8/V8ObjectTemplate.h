#pragma once

#include "v8.h"
#include "V8Context.h"
#include "V8Local.h"
#include "V8Isolate.h"
#include "V8FunctionTemplate.h"
#include "V8MaybeLocal.h"
#include "V8Object.h"
#include "V8Template.h"
#include "shim/ObjectTemplate.h"

namespace v8 {

class ObjectTemplate : public Template {
public:
    FUN_EXPORT static Local<ObjectTemplate> New(Isolate* isolate, Local<FunctionTemplate> constructor = Local<FunctionTemplate>());
    FUN_EXPORT MaybeLocal<Object> NewInstance(Local<Context> context);
    FUN_EXPORT void SetInternalFieldCount(int value);
    FUN_EXPORT int InternalFieldCount() const;

private:
    shim::ObjectTemplate* localToObjectPointer()
    {
        return Data::localToObjectPointer<shim::ObjectTemplate>();
    }

    const shim::ObjectTemplate* localToObjectPointer() const
    {
        return Data::localToObjectPointer<shim::ObjectTemplate>();
    }
};

} // namespace v8
