#pragma once

#include "root.h"
#include <wtf/RefCounted.h>
#include <wtf/Ref.h>

namespace Fun {

// Work queue which really uses CppTask.Concurrent in Fun's event loop (which enqueues into a WorkPool).
// Maintained so that SubtleCrypto functions can pretend they're using a WorkQueue, even though
// WTF::WorkQueue doesn't work and we need to use Fun's equivalent.
class PhonyWorkQueue : public WTF::RefCounted<PhonyWorkQueue> {
public:
    static Ref<PhonyWorkQueue> create(WTF::ASCIILiteral name);

    void dispatch(JSC::JSGlobalObject* globalObject, Function<void()>&&);
};

}; // namespace Fun
