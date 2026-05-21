#include "root.h"
#include "FunBuiltinNames.h"

namespace WebCore {

// FIXME: Remove the __attribute__((nodebug)) when <rdar://68246686> is fixed.
// optnone: with the ctor as the only function in this TU, ModuleInlinerWrapperPass
// otherwise spends ~90s repeatedly devirtualizing/inlining the ~400 Identifier
// calls. The ctor runs once at VM init.
#if COMPILER(CLANG)
__attribute__((nodebug, optnone))
#endif
FunBuiltinNames::FunBuiltinNames(JSC::VM& vm)
    : m_vm(vm)
          FUN_COMMON_PRIVATE_IDENTIFIERS_EACH_PROPERTY_NAME(INITIALIZE_BUILTIN_NAMES)
{
#define EXPORT_NAME(name) m_vm.propertyNames->appendExternalName(name##PublicName(), name##PrivateName());
    FUN_COMMON_PRIVATE_IDENTIFIERS_EACH_PROPERTY_NAME(EXPORT_NAME)
#undef EXPORT_NAME
}

FunBuiltinNames::~FunBuiltinNames() = default;

} // namespace WebCore
