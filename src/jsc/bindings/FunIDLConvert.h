#pragma once
#include "FunIDLTypes.h"
#include "FunIDLConvertBase.h"
#include "FunIDLConvertNumbers.h"
#include "FunIDLHumanReadable.h"
#include "JSDOMConvert.h"
#include <JavaScriptCore/JSArray.h>
#include <tuple>
#include <utility>

template<> struct WebCore::Converter<Fun::IDLRawAny> : WebCore::DefaultConverter<Fun::IDLRawAny> {
    static JSC::JSValue convert(JSC::JSGlobalObject& globalObject, JSC::JSValue value)
    {
        return value;
    }
};

template<> struct WebCore::Converter<Fun::IDLStrictNull>
    : Fun::DefaultTryConverter<Fun::IDLStrictNull> {

    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<std::nullptr_t> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (value.isUndefinedOrNull()) {
            return nullptr;
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotNull(globalObject, scope);
    }
};

template<> struct WebCore::Converter<Fun::IDLStrictUndefined>
    : Fun::DefaultTryConverter<Fun::IDLStrictUndefined> {

    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<std::monostate> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (value.isUndefined()) {
            return std::monostate {};
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotUndefined(globalObject, scope);
    }
};

template<typename IDL>
struct WebCore::Converter<Fun::IDLLooseNullable<IDL>>
    : Fun::DefaultTryConverter<Fun::IDLLooseNullable<IDL>> {

    using ReturnType = WebCore::Converter<WebCore::IDLNullable<IDL>>::ReturnType;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<ReturnType> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (!value.toBoolean(&globalObject))
            return IDL::nullValue();
        return Fun::tryConvertIDL<IDL>(globalObject, value, ctx);
    }

    template<Fun::IDLConversionContext Ctx>
    static ReturnType convert(JSC::JSGlobalObject& globalObject, JSC::JSValue value, Ctx& ctx)
    {
        if (!value.toBoolean(&globalObject))
            return IDL::nullValue();
        return Fun::convertIDL<IDL>(globalObject, value, ctx);
    }
};

template<> struct WebCore::Converter<Fun::IDLStrictBoolean>
    : Fun::DefaultTryConverter<Fun::IDLStrictBoolean> {

    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<bool> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (value.isBoolean()) {
            return value.asBoolean();
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotBoolean(globalObject, scope);
    }
};

template<> struct WebCore::Converter<Fun::IDLStrictString>
    : Fun::DefaultTryConverter<Fun::IDLStrictString> {

    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<WTF::String> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (value.isString()) {
            return value.toWTFString(&globalObject);
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotString(globalObject, scope);
    }
};

template<typename IDL>
struct WebCore::Converter<Fun::IDLArray<IDL>> : Fun::DefaultTryConverter<Fun::IDLArray<IDL>> {
    template<Fun::IDLConversionContext Ctx>
    static std::optional<typename Fun::IDLArray<IDL>::ImplementationType> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (JSC::isJSArray(value)) {
            return Fun::convert<typename Fun::IDLArray<IDL>::Base>(globalObject, value, ctx);
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.template throwNotArray<IDL>(globalObject, scope);
    }
};

template<> struct WebCore::Converter<Fun::IDLArrayBufferRef>
    : Fun::DefaultTryConverter<Fun::IDLArrayBufferRef> {

    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<typename Fun::IDLArrayBufferRef::ImplementationType> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        auto& vm = JSC::getVM(&globalObject);
        if (auto* jsBuffer = JSC::toUnsharedArrayBuffer(vm, value)) {
            return jsBuffer;
        }
        if (auto* jsView = dynamicDowncast<JSC::JSArrayBufferView>(value)) {
            return jsView->unsharedBuffer();
        }
        if (auto* jsDataView = dynamicDowncast<JSC::JSDataView>(value)) {
            return jsDataView->unsharedBuffer();
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotBufferSource(globalObject, scope);
    }
};

template<typename... IDL>
struct WebCore::Converter<Fun::IDLOrderedUnion<IDL...>>
    : Fun::DefaultTryConverter<Fun::IDLOrderedUnion<IDL...>> {
private:
    using Base = Fun::DefaultTryConverter<Fun::IDLOrderedUnion<IDL...>>;

public:
    using typename Base::ReturnType;

    static constexpr bool conversionHasSideEffects
        = (WebCore::Converter<IDL>::conversionHasSideEffects || ...);

    template<Fun::IDLConversionContext Ctx>
    static ReturnType convert(JSC::JSGlobalObject& globalObject, JSC::JSValue value, Ctx& ctx)
    {
        using Last = std::tuple_element_t<sizeof...(IDL) - 1, std::tuple<IDL...>>;
        if constexpr (requires {
                          WebCore::Converter<Last>::tryConvert(globalObject, value, ctx);
                      }) {
            return Base::convert(globalObject, value, ctx);
        } else {
            return convertWithInfallibleLast(
                globalObject,
                value,
                ctx,
                std::make_index_sequence<sizeof...(IDL)> {});
        }
    }

    template<Fun::IDLConversionContext Ctx>
    static std::optional<ReturnType> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        auto& vm = JSC::getVM(&globalObject);
        auto scope = DECLARE_THROW_SCOPE(vm);
        std::optional<ReturnType> result;
        auto tryAlternative = [&]<typename T>() -> bool {
            auto alternativeResult = Fun::tryConvertIDL<T>(globalObject, value, ctx);
            RETURN_IF_EXCEPTION(scope, true);
            if (!alternativeResult.has_value()) {
                return false;
            }
            result = ReturnType { std::move(*alternativeResult) };
            return true;
        };
        (tryAlternative.template operator()<IDL>() || ...);
        return result;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.template throwNoMatchInUnion<IDL...>(globalObject, scope);
    }

private:
    template<Fun::IDLConversionContext Ctx, std::size_t... indices>
    static ReturnType convertWithInfallibleLast(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx,
        std::index_sequence<indices...>)
    {
        auto& vm = JSC::getVM(&globalObject);
        auto scope = DECLARE_THROW_SCOPE(vm);
        std::optional<ReturnType> result;
        auto tryAlternative = [&]<std::size_t index>() -> bool {
            using T = std::tuple_element_t<index, std::tuple<IDL...>>;
            if constexpr (index == sizeof...(IDL) - 1) {
                auto alternativeResult = Fun::convertIDL<T>(globalObject, value, ctx);
                RETURN_IF_EXCEPTION(scope, true);
                result = ReturnType { std::move(alternativeResult) };
                return true;
            } else {
                auto alternativeResult = Fun::tryConvertIDL<T>(globalObject, value, ctx);
                RETURN_IF_EXCEPTION(scope, true);
                if (!alternativeResult.has_value()) {
                    return false;
                }
                result = ReturnType { std::move(*alternativeResult) };
                return true;
            }
        };
        bool done = (tryAlternative.template operator()<indices>() || ...);
        ASSERT(done);
        if (!result.has_value()) {
            // Exception
            return {};
        }
        return std::move(*result);
    }
};
