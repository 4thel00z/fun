#include "NativePromiseContext.h"

#include "ZigGlobalObject.h"

// Implemented in Zig (src/runtime/api/NativePromiseContext.zig). Switches on
// tag to release the ref on the right native type.
extern "C" void Fun__NativePromiseContext__destroy(void* ctx, uint8_t tag);

namespace Fun {

namespace JSCastingHelpers = JSC::JSCastingHelpers;

const JSC::ClassInfo NativePromiseContext::s_info = {
    "NativePromiseContext"_s,
    nullptr,
    nullptr,
    nullptr,
    CREATE_METHOD_TABLE(NativePromiseContext)
};

NativePromiseContext* NativePromiseContext::create(JSC::VM& vm, JSC::Structure* structure, void* ctx, Tag tag)
{
    ASSERT(ctx);
    NativePromiseContext* cell = new (NotNull, JSC::allocateCell<NativePromiseContext>(vm))
        NativePromiseContext(vm, structure, ctx, tag);
    cell->finishCreation(vm);
    return cell;
}

NativePromiseContext::~NativePromiseContext()
{
    if (void* ctx = pointer()) {
        Fun__NativePromiseContext__destroy(ctx, static_cast<uint8_t>(tag()));
    }
}

void NativePromiseContext::destroy(JSC::JSCell* cell)
{
    static_cast<NativePromiseContext*>(cell)->~NativePromiseContext();
}

} // namespace Fun

extern "C" JSC::EncodedJSValue Fun__NativePromiseContext__create(Zig::GlobalObject* globalObject, void* ctx, uint8_t tag)
{
    auto& vm = JSC::getVM(globalObject);
    auto* cell = Fun::NativePromiseContext::create(
        vm,
        globalObject->NativePromiseContextStructure(),
        ctx,
        static_cast<Fun::NativePromiseContext::Tag>(tag));
    return JSC::JSValue::encode(cell);
}

extern "C" void* Fun__NativePromiseContext__take(JSC::EncodedJSValue encodedValue)
{
    auto* cell = uncheckedDowncast<Fun::NativePromiseContext>(JSC::JSValue::decode(encodedValue));
    return cell->take();
}
