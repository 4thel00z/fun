#include "EventLoopTaskNoContext.h"

namespace Fun {

extern "C" void Fun__EventLoopTaskNoContext__performTask(EventLoopTaskNoContext* task)
{
    task->performTask();
}

extern "C" void* Fun__EventLoopTaskNoContext__createdInFunVm(const EventLoopTaskNoContext* task)
{
    return task->createdInFunVm();
}

} // namespace Fun
