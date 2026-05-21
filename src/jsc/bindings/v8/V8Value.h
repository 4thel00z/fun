#pragma once

#include "V8Data.h"
#include "V8Maybe.h"
#include "V8Local.h"
#include "V8Context.h"

namespace v8 {

class Value : public Data {
public:
    FUN_EXPORT bool IsBoolean() const;
    FUN_EXPORT bool IsObject() const;
    FUN_EXPORT bool IsNumber() const;
    FUN_EXPORT bool IsUint32() const;
    FUN_EXPORT bool IsFunction() const;
    FUN_EXPORT bool IsMap() const;
    FUN_EXPORT bool IsArray() const;
    FUN_EXPORT bool IsInt32() const;
    FUN_EXPORT bool IsBigInt() const;
    FUN_EXPORT Maybe<uint32_t> Uint32Value(Local<Context> context) const;

    // Comparison methods
    FUN_EXPORT bool StrictEquals(Local<Value> that) const;

    // usually inlined:
    FUN_EXPORT bool IsUndefined() const;
    FUN_EXPORT bool IsNull() const;
    FUN_EXPORT bool IsNullOrUndefined() const;
    FUN_EXPORT bool IsTrue() const;
    FUN_EXPORT bool IsFalse() const;
    FUN_EXPORT bool IsString() const;

private:
    // non-inlined versions of these
    FUN_EXPORT bool FullIsTrue() const;
    FUN_EXPORT bool FullIsFalse() const;
};

} // namespace v8
