#pragma once
#include "FunIDLTypes.h"
#include "FunIDLConvertBase.h"
#include "blob.h"
#include "ZigGeneratedClasses.h"

namespace Fun {
struct IDLBlobRef : IDLFunInterface<WebCore::BlobImpl, WebCore::BlobImplRefDerefTraits> {};
}

template<> struct WebCore::Converter<Fun::IDLBlobRef> : Fun::DefaultTryConverter<Fun::IDLBlobRef> {
    static constexpr bool conversionHasSideEffects = false;

    template<Fun::IDLConversionContext Ctx>
    static std::optional<typename Fun::IDLBlobRef::ImplementationType> tryConvert(
        JSC::JSGlobalObject& globalObject,
        JSC::JSValue value,
        Ctx& ctx)
    {
        if (auto* jsBlob = dynamicDowncast<WebCore::JSBlob>(value)) {
            if (void* wrapped = jsBlob->wrapped()) {
                return static_cast<BlobImpl*>(wrapped);
            }
        }
        return std::nullopt;
    }

    template<Fun::IDLConversionContext Ctx>
    static void throwConversionFailed(
        JSC::JSGlobalObject& globalObject,
        JSC::ThrowScope& scope,
        Ctx& ctx)
    {
        ctx.throwNotBlob(globalObject, scope);
    }
};
