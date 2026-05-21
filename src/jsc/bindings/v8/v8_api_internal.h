#pragma once

#include "v8.h"
#include "v8_internal.h"

namespace v8 {

class Isolate;
template<typename T>
class Local;
class Value;
class Data;

namespace api_internal {

FUN_EXPORT void ToLocalEmpty();
FUN_EXPORT void FromJustIsNothing();
FUN_EXPORT uintptr_t* GlobalizeReference(v8::internal::Isolate* isolate, uintptr_t address);
FUN_EXPORT void DisposeGlobal(uintptr_t* location);
FUN_EXPORT Local<Value> GetFunctionTemplateData(Isolate* isolate, Local<Data> target);

} // namespace api_internal
} // namespace v8
