#pragma once

// This file defines macros to check compatibility between types from V8 and types from Fun's V8
// implementation. The same warning as in real_v8.h applies: only include this in source files in
// the v8 directory.

#include "real_v8.h"

#define V8_TYPE_ASSERTIONS_NAMESPACE_NAME_INDIRECT(LINE) V8TypeAssertions__##LINE

#define V8_TYPE_ASSERTIONS_NAMESPACE_NAME(LINE) \
    V8_TYPE_ASSERTIONS_NAMESPACE_NAME_INDIRECT(LINE)

// usage: [*outside* namespace v8] ASSERT_V8_TYPE_LAYOUT_MATCHES(v8::SomeTemplate<v8::SomeParam>)
#define ASSERT_V8_TYPE_LAYOUT_MATCHES(TYPENAME)                                       \
    namespace V8_TYPE_ASSERTIONS_NAMESPACE_NAME(__COUNTER__) {                        \
    namespace DeclareFunType {                                                        \
    namespace v8 = ::v8;                                                              \
    using FunType = TYPENAME;                                                         \
    }                                                                                 \
                                                                                      \
    namespace DeclareV8Type {                                                         \
    namespace v8 = ::real_v8;                                                         \
    using V8Type = TYPENAME;                                                          \
    }                                                                                 \
                                                                                      \
    static_assert(sizeof(DeclareFunType::FunType) == sizeof(DeclareV8Type::V8Type),   \
        "size of " #TYPENAME " does not match between Fun and V8");                   \
    static_assert(alignof(DeclareFunType::FunType) == alignof(DeclareV8Type::V8Type), \
        "alignment of " #TYPENAME " does not match between Fun and V8");              \
    }

// usage: [*outside* namespace v8] ASSERT_V8_TYPE_FIELD_OFFSET_MATCHES(v8::Maybe<int>, m_hasValue, has_value_)
#define ASSERT_V8_TYPE_FIELD_OFFSET_MATCHES(TYPENAME, FUN_FIELD_NAME, V8_FIELD_NAME)       \
    namespace V8_TYPE_ASSERTIONS_NAMESPACE_NAME(__COUNTER__) {                             \
    namespace DeclareFunType {                                                             \
    namespace v8 = ::v8;                                                                   \
    using FunType = TYPENAME;                                                              \
    }                                                                                      \
                                                                                           \
    namespace DeclareV8Type {                                                              \
    namespace v8 = ::real_v8;                                                              \
    using V8Type = TYPENAME;                                                               \
    }                                                                                      \
                                                                                           \
    static_assert(offsetof(DeclareFunType::FunType, FUN_FIELD_NAME)                        \
            == offsetof(DeclareV8Type::V8Type, V8_FIELD_NAME),                             \
        "offset of " #TYPENAME "::" #FUN_FIELD_NAME " does not match between Fun and V8"); \
    }

// usage: [*outside* namespace v8] ASSERT_V8_ENUM_MATCHES(ConstructorBehavior, kAllow)
#define ASSERT_V8_ENUM_MATCHES(ENUM_NAME, ENUMERATOR_NAME)                                             \
    static_assert((int)::v8::ENUM_NAME::ENUMERATOR_NAME == (int)::real_v8::ENUM_NAME::ENUMERATOR_NAME, \
        "enumerator " #ENUM_NAME "::" #ENUMERATOR_NAME " does not match between Fun and V8");
