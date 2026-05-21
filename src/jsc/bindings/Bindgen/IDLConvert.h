#pragma once
#include <FunIDLConvert.h>
#include "IDLTypes.h"
#include "IDLConvertBase.h"

namespace Fun {
template<> struct IDLHumanReadableName<Bindgen::IDLStrongAny> : BaseIDLHumanReadableName {
    static constexpr auto humanReadableName = std::to_array("any");
};
}

template<> struct WebCore::Converter<Fun::Bindgen::IDLStrongAny>
    : WebCore::DefaultConverter<Fun::Bindgen::IDLStrongAny> {

    static Fun::StrongRef convert(JSC::JSGlobalObject& globalObject, JSC::JSValue value)
    {
        return Fun::StrongRef { Fun__StrongRef__new(&globalObject, JSC::JSValue::encode(value)) };
    }
};
