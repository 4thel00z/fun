#pragma once
#include <cstddef>
#include <cstdint>
#include <type_traits>
#include <variant>
#include "Macros.h"

#define FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, ...)                    \
    template<typename T0 __VA_OPT__(                                       \
        FUN_BINDGEN_DETAIL_FOREACH(                                        \
            FUN_BINDGEN_DETAIL_EXTERN_UNION_TEMPLATE_PARAM,                \
            __VA_ARGS__))>                                                 \
    union ExternUnion<T0 __VA_OPT__(, ) __VA_ARGS__> {                     \
        FUN_BINDGEN_DETAIL_FOREACH(                                        \
            FUN_BINDGEN_DETAIL_EXTERN_UNION_FIELD,                         \
            T0 __VA_OPT__(, ) __VA_ARGS__)                                 \
        ExternUnion(std::variant<T0 __VA_OPT__(, ) __VA_ARGS__>&& variant) \
        {                                                                  \
            using This = std::decay_t<decltype(*this)>;                    \
            static_assert(std::is_trivially_copyable_v<This>);             \
            const std::size_t index = variant.index();                     \
            std::visit([this, index](auto&& arg) {                         \
                using Arg = std::decay_t<decltype(arg)>;                   \
                FUN_BINDGEN_DETAIL_FOREACH(                                \
                    FUN_BINDGEN_DETAIL_EXTERN_UNION_VISIT,                 \
                    T0 __VA_OPT__(, ) __VA_ARGS__)                         \
            },                                                             \
                std::move(variant));                                       \
        }                                                                  \
    }

#define FUN_BINDGEN_DETAIL_EXTERN_UNION_TEMPLATE_PARAM(Type) , typename Type
#define FUN_BINDGEN_DETAIL_EXTERN_UNION_FIELD(Type) Type alternative##Type;
#define FUN_BINDGEN_DETAIL_EXTERN_UNION_VISIT(Type)           \
    if constexpr (std::is_same_v<Arg, Type>) {                \
        if (index == ::Fun::Bindgen::Detail::indexOf##Type) { \
            alternative##Type = std::move(arg);               \
            return;                                           \
        }                                                     \
    }

namespace Fun::Bindgen {
namespace Detail {
// For use in macros.
static constexpr std::size_t indexOfT0 = 0;
static constexpr std::size_t indexOfT1 = 1;
static constexpr std::size_t indexOfT2 = 2;
static constexpr std::size_t indexOfT3 = 3;
static constexpr std::size_t indexOfT4 = 4;
static constexpr std::size_t indexOfT5 = 5;
static constexpr std::size_t indexOfT6 = 6;
static constexpr std::size_t indexOfT7 = 7;
static constexpr std::size_t indexOfT8 = 8;
static constexpr std::size_t indexOfT9 = 9;
static constexpr std::size_t indexOfT10 = 10;
static constexpr std::size_t indexOfT11 = 11;
static constexpr std::size_t indexOfT12 = 12;
static constexpr std::size_t indexOfT13 = 13;
static constexpr std::size_t indexOfT14 = 14;
static constexpr std::size_t indexOfT15 = 15;
}

template<typename... Args>
union ExternUnion;

FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4, T5);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4, T5, T6);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4, T5, T6, T7);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4, T5, T6, T7, T8);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(T0, T1, T2, T3, T4, T5, T6, T7, T8, T9);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14);
FUN_BINDGEN_DETAIL_DEFINE_EXTERN_UNION(
    T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15);
}
