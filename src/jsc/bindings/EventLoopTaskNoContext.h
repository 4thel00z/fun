#pragma once

#include "ZigGlobalObject.h"
#include "root.h"

namespace Fun {

// Just like WebCore::EventLoopTask but does not take a ScriptExecutionContext
class EventLoopTaskNoContext {
    WTF_MAKE_TZONE_ALLOCATED(EventLoopTaskNoContext);

public:
    EventLoopTaskNoContext(JSC::JSGlobalObject* globalObject, Function<void()>&& task)
        : m_createdInFunVm(defaultGlobalObject(globalObject)->funVM())
        , m_task(WTF::move(task))
    {
    }

    void performTask()
    {
        m_task();
        delete this;
    }

    void* createdInFunVm() const { return m_createdInFunVm; }

private:
    void* m_createdInFunVm;
    Function<void()> m_task;
};

extern "C" void Fun__EventLoopTaskNoContext__performTask(EventLoopTaskNoContext* task);
extern "C" void* Fun__EventLoopTaskNoContext__createdInFunVm(const EventLoopTaskNoContext* task);

} // namespace Fun
