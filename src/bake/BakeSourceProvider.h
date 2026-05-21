#pragma once
#include "root.h"
#include "headers-handwritten.h"
#include "BakeGlobalObject.h"
#include "JavaScriptCore/SourceOrigin.h"

namespace Bake {

class SourceProvider;

extern "C" void Fun__addBakeSourceProviderSourceMap(void* fun_vm, SourceProvider* opaque_source_provider, FunString* specifier);

class SourceProvider final : public JSC::StringSourceProvider {
public:
    static Ref<SourceProvider> create(
        JSC::JSGlobalObject* globalObject,
        const String& source,
        const JSC::SourceOrigin& sourceOrigin,
        String&& sourceURL,
        const TextPosition& startPosition,
        JSC::SourceProviderSourceType sourceType)
    {
        auto provider = adoptRef(*new SourceProvider(source, sourceOrigin, WTF::move(sourceURL), startPosition, sourceType));
        auto* zigGlobalObject = uncheckedDowncast<Zig::GlobalObject>(globalObject);
        auto specifier = Fun::toString(provider->sourceURL());
        Fun__addBakeSourceProviderSourceMap(zigGlobalObject->funVM(), provider.ptr(), &specifier);
        return provider;
    }

private:
    SourceProvider(
        const String& source,
        const JSC::SourceOrigin& sourceOrigin,
        String&& sourceURL,
        const TextPosition& startPosition,
        JSC::SourceProviderSourceType sourceType)
        : StringSourceProvider(
              source,
              sourceOrigin,
              JSC::SourceTaintedOrigin::Untainted,
              WTF::move(sourceURL),
              startPosition,
              sourceType)
    {
    }
};

} // namespace Bake
