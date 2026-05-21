#include "DevServerSourceProvider.h"
#include "FunBuiltinNames.h"
#include "FunString.h"

// The Zig implementation will be provided to handle registration
extern "C" void Fun__addDevServerSourceProvider(void* fun_vm, Bake::DevServerSourceProvider* opaque_source_provider, FunString* specifier);

// Export functions for Zig to access DevServerSourceProvider
extern "C" FunString DevServerSourceProvider__getSourceSlice(Bake::DevServerSourceProvider* provider)
{
    return Fun::toStringView(provider->source());
}

extern "C" MiCString DevServerSourceProvider__getSourceMapJSON(Bake::DevServerSourceProvider* provider)
{
    return provider->sourceMapJSON();
}
