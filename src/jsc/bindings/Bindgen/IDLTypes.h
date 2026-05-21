#pragma once
#include <FunIDLTypes.h>
#include <StrongRef.h>

namespace Fun::Bindgen {

// See also: Fun::IDLRawAny
struct IDLStrongAny : WebCore::IDLType<Fun::StrongRef> {
    using NullableType = Fun::StrongRef;
    using NullableInnerParameterType = NullableType;

    static inline std::nullptr_t nullValue() { return nullptr; }
    template<typename U> static inline bool isNullValue(U&& value) { return !value; }
    template<typename U> static inline U&& extractValueFromNullable(U&& value)
    {
        return std::forward<U>(value);
    }
};

template<typename T>
struct IsIDLStrongAny : std::integral_constant<bool, std::is_base_of<IDLStrongAny, T>::value> {};

// Dictionaries that contain raw `JSValue`s must live on the stack.
template<typename T>
struct IDLStackOnlyDictionary : WebCore::IDLType<T> {
    using SequenceStorageType = void;
    using ParameterType = const T&;
    using NullableParameterType = const T&;
};

}
