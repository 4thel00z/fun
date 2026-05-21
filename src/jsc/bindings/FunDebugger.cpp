#include "root.h"

#include "ZigGlobalObject.h"

#include <JavaScriptCore/InspectorFrontendChannel.h>
#include <JavaScriptCore/JSGlobalObjectDebuggable.h>
#include <JavaScriptCore/JSGlobalObjectDebugger.h>
#include <JavaScriptCore/Debugger.h>
#include <wtf/Condition.h>
#include "ScriptExecutionContext.h"
#include "debug-helpers.h"
#include "FunInjectedScriptHost.h"
#include <JavaScriptCore/JSGlobalObjectInspectorController.h>

#include "InspectorLifecycleAgent.h"
#include "InspectorTestReporterAgent.h"
#include "InspectorFunFrontendDevServerAgent.h"
#include "InspectorHTTPServerAgent.h"

extern "C" void Fun__tickWhilePaused(bool*);
extern "C" void Fun__eventLoop__incrementRefConcurrently(void* funVM, int delta);

namespace Fun {
using namespace JSC;
using namespace WebCore;

class FunInspectorConnection;

static WebCore::ScriptExecutionContext* debuggerScriptExecutionContext = nullptr;
static WTF::Lock inspectorConnectionsLock = WTF::Lock();
static WTF::UncheckedKeyHashMap<ScriptExecutionContextIdentifier, Vector<FunInspectorConnection*, 8>>* inspectorConnections = nullptr;

// When the inspected JS thread is paused at a breakpoint (inside runWhilePaused),
// it waits on this condition for the debugger thread to deliver new messages or
// for a connection status change. This replaces a busy spin loop that would pin
// one core at 100% CPU while paused. Wrapped in a function-local static so it
// doesn't add a static initializer to the binary.
struct PausedWait {
    WTF::Lock lock;
    WTF::Condition condition;
};

static PausedWait& pausedWait()
{
    static PausedWait instance;
    return instance;
}

static bool waitingForConnection = false;
extern "C" void Debugger__didConnect();

class FunJSGlobalObjectDebuggable final : public JSC::JSGlobalObjectDebuggable {
public:
    using Base = JSC::JSGlobalObjectDebuggable;

    FunJSGlobalObjectDebuggable(JSC::JSGlobalObject& globalObject)
        : Base(globalObject)
    {
    }

    ~FunJSGlobalObjectDebuggable() final
    {
    }

    static Ref<FunJSGlobalObjectDebuggable> create(JSGlobalObject& globalObject)
    {
        return adoptRef(*new FunJSGlobalObjectDebuggable(globalObject));
    }

    void pauseWaitingForAutomaticInspection() override
    {
    }
    void unpauseForResolvedAutomaticInspection() override
    {
        if (waitingForConnection) {
            waitingForConnection = false;
            Debugger__didConnect();
        }
    }
};

enum class ConnectionStatus : int32_t {
    Pending = 0,
    Connected = 1,
    Disconnecting = 2,
    Disconnected = 3,
};

class FunInspectorConnection : public Inspector::FrontendChannel {

public:
    FunInspectorConnection(ScriptExecutionContext& scriptExecutionContext, JSC::JSGlobalObject* globalObject, bool shouldRefEventLoop)
        : Inspector::FrontendChannel()
        , globalObject(globalObject)
        , scriptExecutionContextIdentifier(scriptExecutionContext.identifier())
        , unrefOnDisconnect(shouldRefEventLoop)
    {
    }

    ~FunInspectorConnection()
    {
    }

    static FunInspectorConnection* create(ScriptExecutionContext& scriptExecutionContext, JSC::JSGlobalObject* globalObject, bool shouldRefEventLoop)
    {
        return new FunInspectorConnection(scriptExecutionContext, globalObject, shouldRefEventLoop);
    }

    ConnectionType connectionType() const override
    {
        return ConnectionType::Remote;
    }

    void doConnect(WebCore::ScriptExecutionContext& context)
    {
        this->status = ConnectionStatus::Connected;
        auto* globalObject = context.jsGlobalObject();
        if (this->unrefOnDisconnect) {
            Fun__eventLoop__incrementRefConcurrently(static_cast<Zig::GlobalObject*>(globalObject)->funVM(), 1);
        }
        globalObject->setInspectable(true);
        auto& inspector = globalObject->inspectorDebuggable();
        inspector.setInspectable(true);

        static bool hasConnected = false;

        if (!hasConnected) {
            hasConnected = true;
            globalObject->inspectorController().registerAlternateAgent(
                WTF::makeUniqueRef<Inspector::InspectorLifecycleAgent>(*globalObject));
            globalObject->inspectorController().registerAlternateAgent(
                WTF::makeUniqueRef<Inspector::InspectorTestReporterAgent>(*globalObject));
            globalObject->inspectorController().registerAlternateAgent(
                WTF::makeUniqueRef<Inspector::InspectorFunFrontendDevServerAgent>(*globalObject));
            globalObject->inspectorController().registerAlternateAgent(
                WTF::makeUniqueRef<Inspector::InspectorHTTPServerAgent>(*globalObject));
        }

        this->hasEverConnected = true;
        globalObject->inspectorController().connectFrontend(*this, true, false); // waitingForConnection

        Inspector::JSGlobalObjectDebugger* debugger = reinterpret_cast<Inspector::JSGlobalObjectDebugger*>(globalObject->debugger());
        if (debugger) {
            debugger->runWhilePausedCallback = [](JSC::JSGlobalObject& globalObject, bool& isDoneProcessingEvents) -> void {
                FunInspectorConnection::runWhilePaused(globalObject, isDoneProcessingEvents);
            };
        }

        this->receiveMessagesOnInspectorThread(context, static_cast<Zig::GlobalObject*>(globalObject), false);
    }

    void connect()
    {
        switch (this->status) {
        case ConnectionStatus::Disconnected:
        case ConnectionStatus::Disconnecting: {
            return;
        }
        default: {
            break;
        }
        }

        notifyPausedThread();

        ScriptExecutionContext::ensureOnContextThread(scriptExecutionContextIdentifier, [connection = this](ScriptExecutionContext& context) {
            switch (connection->status) {
            case ConnectionStatus::Pending: {
                connection->doConnect(context);
                break;
            }
            default: {
                break;
            }
            }
        });
    }

    void disconnect()
    {
        notifyPausedThread();

        switch (this->status) {
        case ConnectionStatus::Disconnected: {
            return;
        }
        default: {
            break;
        }
        }

        ScriptExecutionContext::ensureOnContextThread(scriptExecutionContextIdentifier, [connection = this](ScriptExecutionContext& context) {
            if (connection->status == ConnectionStatus::Disconnected)
                return;

            connection->status = ConnectionStatus::Disconnected;

            // Do not call .disconnect() if we never actually connected.
            if (connection->hasEverConnected) {
                connection->inspector().disconnect(*connection);
            }

            if (connection->unrefOnDisconnect) {
                connection->unrefOnDisconnect = false;
                Fun__eventLoop__incrementRefConcurrently(static_cast<Zig::GlobalObject*>(context.jsGlobalObject())->funVM(), -1);
            }
        });
    }

    JSC::JSGlobalObjectDebuggable& inspector()
    {
        return globalObject->inspectorDebuggable();
    }

    void sendMessageToFrontend(const String& message) override
    {
        if (message.length() == 0)
            return;

        this->sendMessageToDebuggerThread(message.isolatedCopy());
    }

    static void runWhilePaused(JSGlobalObject& globalObject, bool& isDoneProcessingEvents)
    {
        Zig::GlobalObject* global = static_cast<Zig::GlobalObject*>(&globalObject);
        Vector<FunInspectorConnection*, 8> connections;
        {
            Locker<Lock> locker(inspectorConnectionsLock);
            connections.appendVector(inspectorConnections->get(global->scriptExecutionContext()->identifier()));
        }

        for (auto* connection : connections) {
            if (connection->status == ConnectionStatus::Pending) {
                connection->connect();
                continue;
            }

            if (connection->status != ConnectionStatus::Disconnected) {
                connection->receiveMessagesOnInspectorThread(*global->scriptExecutionContext(), global, true);
            }
        }

        while (!isDoneProcessingEvents) {
            size_t closedCount = 0;
            for (auto* connection : connections) {
                ConnectionStatus status = connection->status.load();
                if (status == ConnectionStatus::Disconnected || status == ConnectionStatus::Disconnecting) {
                    closedCount++;
                    continue;
                }
                connection->receiveMessagesOnInspectorThread(*global->scriptExecutionContext(), global, true);
                if (isDoneProcessingEvents)
                    break;
            }

            if (isDoneProcessingEvents)
                break;

            if (closedCount == connections.size()) {
                if (global->debugger() && global->debugger()->isPaused()) {
                    global->debugger()->continueProgram();
                }
                break;
            }

            // Block until the debugger thread delivers a new message or a
            // connection disconnects. Use a timeout as a safety net so that a
            // missed wakeup cannot leave the process stuck forever; with no
            // messages we'll simply re-check once per second instead of
            // spinning at 100% CPU.
            {
                auto& wait = pausedWait();
                Locker<Lock> waitLocker(wait.lock);
                if (!isDoneProcessingEvents && !anyConnectionHasPendingWork(connections, closedCount)) {
                    wait.condition.waitFor(wait.lock, Seconds(1));
                }
            }
        }
    }

    static bool anyConnectionHasPendingWork(const Vector<FunInspectorConnection*, 8>& connections, size_t previousClosedCount)
    {
        size_t closedCount = 0;
        for (auto* connection : connections) {
            ConnectionStatus status = connection->status.load();
            if (status == ConnectionStatus::Disconnected || status == ConnectionStatus::Disconnecting) {
                closedCount++;
                continue;
            }

            Locker<Lock> locker(connection->jsThreadMessagesLock);
            if (!connection->jsThreadMessages.isEmpty())
                return true;
        }
        // A connection that was already counted as closed by the caller is
        // not new work and must not keep us from sleeping (otherwise one
        // closed connection among several would cause us to spin). Only
        // treat a *change* in the closed count as pending work so the outer
        // loop re-evaluates whether every connection is gone.
        return closedCount != previousClosedCount;
    }

    // Wake the inspected thread if it is blocked inside runWhilePaused.
    // Safe to call from any thread; cheap when nobody is waiting.
    static void notifyPausedThread()
    {
        auto& wait = pausedWait();
        Locker<Lock> locker(wait.lock);
        wait.condition.notifyAll();
    }

    void receiveMessagesOnInspectorThread(ScriptExecutionContext& context, Zig::GlobalObject* globalObject, bool connectIfNeeded)
    {
        this->jsThreadMessageScheduledCount.store(0);
        WTF::Vector<WTF::String, 12> messages;

        {
            Locker<Lock> locker(jsThreadMessagesLock);
            this->jsThreadMessages.swap(messages);
        }

        auto& dispatcher = globalObject->inspectorDebuggable();
        Inspector::JSGlobalObjectDebugger* debugger = reinterpret_cast<Inspector::JSGlobalObjectDebugger*>(globalObject->debugger());

        if (!debugger) {
            if (connectIfNeeded && this->status == ConnectionStatus::Pending) {
                this->doConnect(context);
                return;
            }

            for (auto message : messages) {
                dispatcher.dispatchMessageFromRemote(WTF::move(message));

                if (!debugger) {
                    debugger = reinterpret_cast<Inspector::JSGlobalObjectDebugger*>(globalObject->debugger());
                    if (debugger) {
                        debugger->runWhilePausedCallback = [](JSC::JSGlobalObject& globalObject, bool& isDoneProcessingEvents) -> void {
                            runWhilePaused(globalObject, isDoneProcessingEvents);
                        };
                    }
                }
            }
        } else {
            for (auto message : messages) {
                dispatcher.dispatchMessageFromRemote(WTF::move(message));
            }
        }

        messages.clear();
    }

    void receiveMessagesOnDebuggerThread(ScriptExecutionContext& context, Zig::GlobalObject* debuggerGlobalObject)
    {
        debuggerThreadMessageScheduledCount.store(0);
        WTF::Vector<WTF::String, 12> messages;

        {
            Locker<Lock> locker(debuggerThreadMessagesLock);
            this->debuggerThreadMessages.swap(messages);
        }

        JSFunction* onMessageFn = uncheckedDowncast<JSFunction>(jsFunDebuggerOnMessageFunction.get());
        MarkedArgumentBuffer arguments;
        arguments.ensureCapacity(messages.size());
        auto& vm = debuggerGlobalObject->vm();

        for (auto& message : messages) {
            arguments.append(jsString(vm, message));
        }

        messages.clear();

        JSC::call(debuggerGlobalObject, onMessageFn, arguments, "FunInspectorConnection::receiveMessagesOnDebuggerThread - onMessageFn"_s);
    }

    void sendMessageToDebuggerThread(WTF::String&& inputMessage)
    {
        {
            Locker<Lock> locker(debuggerThreadMessagesLock);
            debuggerThreadMessages.append(inputMessage);
        }

        if (this->debuggerThreadMessageScheduledCount++ == 0) {
            debuggerScriptExecutionContext->postTaskConcurrently([connection = this](ScriptExecutionContext& context) {
                connection->receiveMessagesOnDebuggerThread(context, static_cast<Zig::GlobalObject*>(context.jsGlobalObject()));
            });
        }
    }

    void sendMessageToInspectorFromDebuggerThread(Vector<WTF::String, 12>&& inputMessages)
    {
        {
            Locker<Lock> locker(jsThreadMessagesLock);
            jsThreadMessages.appendVector(inputMessages);
        }

        notifyPausedThread();

        if (this->jsThreadMessageScheduledCount++ == 0) {
            ScriptExecutionContext::postTaskTo(scriptExecutionContextIdentifier, [connection = this](ScriptExecutionContext& context) {
                connection->receiveMessagesOnInspectorThread(context, static_cast<Zig::GlobalObject*>(context.jsGlobalObject()), true);
            });
        }
    }

    void sendMessageToInspectorFromDebuggerThread(const WTF::String& inputMessage)
    {
        {
            Locker<Lock> locker(jsThreadMessagesLock);
            jsThreadMessages.append(inputMessage);
        }

        notifyPausedThread();

        if (this->jsThreadMessageScheduledCount++ == 0) {
            ScriptExecutionContext::postTaskTo(scriptExecutionContextIdentifier, [connection = this](ScriptExecutionContext& context) {
                connection->receiveMessagesOnInspectorThread(context, static_cast<Zig::GlobalObject*>(context.jsGlobalObject()), true);
            });
        }
    }

    WTF::Vector<WTF::String, 12> debuggerThreadMessages;
    WTF::Lock debuggerThreadMessagesLock = WTF::Lock();
    std::atomic<uint32_t> debuggerThreadMessageScheduledCount { 0 };

    WTF::Vector<WTF::String, 12> jsThreadMessages;
    WTF::Lock jsThreadMessagesLock = WTF::Lock();
    std::atomic<uint32_t> jsThreadMessageScheduledCount { 0 };

    JSC::JSGlobalObject* globalObject;
    ScriptExecutionContextIdentifier scriptExecutionContextIdentifier;
    JSC::Strong<JSC::Unknown> jsFunDebuggerOnMessageFunction {};

    std::atomic<ConnectionStatus> status = ConnectionStatus::Pending;

    bool unrefOnDisconnect = false;

    bool hasEverConnected = false;
};

JSC_DECLARE_HOST_FUNCTION(jsFunctionSend);
JSC_DECLARE_HOST_FUNCTION(jsFunctionDisconnect);

class JSFunInspectorConnection final : public JSC::JSNonFinalObject {
public:
    using Base = JSC::JSNonFinalObject;
    static constexpr unsigned StructureFlags = Base::StructureFlags;
    static constexpr JSC::DestructionMode needsDestruction = DoesNotNeedDestruction;

    static JSFunInspectorConnection* create(JSC::VM& vm, JSC::Structure* structure, FunInspectorConnection* connection)
    {
        JSFunInspectorConnection* ptr = new (NotNull, JSC::allocateCell<JSFunInspectorConnection>(vm)) JSFunInspectorConnection(vm, structure, connection);
        ptr->finishCreation(vm);
        return ptr;
    }

    DECLARE_EXPORT_INFO;
    template<typename, SubspaceAccess mode>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        if constexpr (mode == JSC::SubspaceAccess::Concurrently)
            return nullptr;
        return WebCore::subspaceForImpl<JSFunInspectorConnection, WebCore::UseCustomHeapCellType::No>(
            vm,
            [](auto& spaces) { return spaces.m_clientSubspaceForFunInspectorConnection.get(); },
            [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForFunInspectorConnection = std::forward<decltype(space)>(space); },
            [](auto& spaces) { return spaces.m_subspaceForFunInspectorConnection.get(); },
            [](auto& spaces, auto&& space) { spaces.m_subspaceForFunInspectorConnection = std::forward<decltype(space)>(space); });
    }
    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info(), JSC::NonArray);
    }

    FunInspectorConnection* connection()
    {
        return m_connection;
    }

private:
    JSFunInspectorConnection(JSC::VM& vm, JSC::Structure* structure, FunInspectorConnection* connection)
        : Base(vm, structure)
        , m_connection(connection)
    {
    }

    void finishCreation(JSC::VM& vm)
    {
        Base::finishCreation(vm);
    }

    FunInspectorConnection* m_connection;
};

JSC_DEFINE_HOST_FUNCTION(jsFunctionSend, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto* jsConnection = dynamicDowncast<JSFunInspectorConnection>(callFrame->thisValue());
    auto message = callFrame->uncheckedArgument(0);

    if (!jsConnection)
        return JSValue::encode(jsUndefined());

    if (message.isString()) {
        jsConnection->connection()->sendMessageToInspectorFromDebuggerThread(message.toWTFString(globalObject).isolatedCopy());
    } else if (message.isCell()) {
        auto* array = uncheckedDowncast<JSArray>(message.asCell());
        Vector<WTF::String, 12> messages;
        JSC::forEachInArrayLike(globalObject, array, [&](JSC::JSValue value) -> bool {
            messages.append(value.toWTFString(globalObject).isolatedCopy());
            return true;
        });
        jsConnection->connection()->sendMessageToInspectorFromDebuggerThread(WTF::move(messages));
    }

    return JSValue::encode(jsUndefined());
}

JSC_DEFINE_HOST_FUNCTION(jsFunctionDisconnect, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto* jsConnection = dynamicDowncast<JSFunInspectorConnection>(callFrame->thisValue());
    if (!jsConnection)
        return JSValue::encode(jsUndefined());

    auto& connection = *jsConnection->connection();

    if (connection.status == ConnectionStatus::Connected || connection.status == ConnectionStatus::Pending) {
        connection.status = ConnectionStatus::Disconnecting;
        connection.disconnect();
    }

    return JSValue::encode(jsUndefined());
}

const JSC::ClassInfo JSFunInspectorConnection::s_info = { "FunInspectorConnection"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFunInspectorConnection) };

extern "C" unsigned int Fun__createJSDebugger(Zig::GlobalObject* globalObject)
{
    {
        Locker<Lock> locker(inspectorConnectionsLock);
        if (inspectorConnections == nullptr) {
            inspectorConnections = new WTF::UncheckedKeyHashMap<ScriptExecutionContextIdentifier, Vector<FunInspectorConnection*, 8>>();
        }

        inspectorConnections->add(globalObject->scriptExecutionContext()->identifier(), Vector<FunInspectorConnection*, 8>());
    }

    return static_cast<unsigned int>(globalObject->scriptExecutionContext()->identifier());
}
extern "C" void Fun__tickWhilePaused(bool*);

extern "C" void Fun__ensureDebugger(ScriptExecutionContextIdentifier scriptId, bool pauseOnStart)
{

    auto* globalObject = ScriptExecutionContext::getScriptExecutionContext(scriptId)->jsGlobalObject();
    globalObject->m_inspectorController = makeUnique<Inspector::JSGlobalObjectInspectorController>(*globalObject, Fun::FunInjectedScriptHost::create());
    globalObject->m_inspectorDebuggable = FunJSGlobalObjectDebuggable::create(*globalObject);
    globalObject->m_inspectorDebuggable->init();

    globalObject->setInspectable(true);

    auto& inspector = globalObject->inspectorDebuggable();
    inspector.setInspectable(true);

    Inspector::JSGlobalObjectDebugger* debugger = reinterpret_cast<Inspector::JSGlobalObjectDebugger*>(globalObject->debugger());
    if (debugger) {
        debugger->runWhilePausedCallback = [](JSC::JSGlobalObject& globalObject, bool& isDoneProcessingEvents) -> void {
            FunInspectorConnection::runWhilePaused(globalObject, isDoneProcessingEvents);
        };
    }
    if (pauseOnStart) {
        waitingForConnection = true;
    }
}

extern "C" void FunDebugger__willHotReload()
{
    if (debuggerScriptExecutionContext == nullptr) {
        return;
    }

    debuggerScriptExecutionContext->postTaskConcurrently([](ScriptExecutionContext& context) {
        Locker<Lock> locker(inspectorConnectionsLock);
        for (auto& connections : *inspectorConnections) {
            for (auto* connection : connections.value) {
                connection->sendMessageToFrontend("{\"method\":\"Fun.canReload\"}"_s);
            }
        }
    });
}

JSC_DEFINE_HOST_FUNCTION(jsFunctionCreateConnection, (JSGlobalObject * globalObject, CallFrame* callFrame))
{
    auto* debuggerGlobalObject = dynamicDowncast<Zig::GlobalObject>(globalObject);
    if (!debuggerGlobalObject)
        return JSValue::encode(jsUndefined());

    ScriptExecutionContext* targetContext = ScriptExecutionContext::getScriptExecutionContext(static_cast<ScriptExecutionContextIdentifier>(callFrame->argument(0).toUInt32(globalObject)));
    bool shouldRef = !callFrame->argument(1).toBoolean(globalObject);
    JSFunction* onMessageFn = uncheckedDowncast<JSFunction>(callFrame->argument(2).toObject(globalObject));

    if (!targetContext || !onMessageFn)
        return JSValue::encode(jsUndefined());

    auto& vm = JSC::getVM(globalObject);
    auto connection = FunInspectorConnection::create(
        *targetContext,
        targetContext->jsGlobalObject(), shouldRef);

    {
        Locker<Lock> locker(inspectorConnectionsLock);
        auto connections = inspectorConnections->get(targetContext->identifier());
        connections.append(connection);
        inspectorConnections->set(targetContext->identifier(), connections);
    }
    connection->jsFunDebuggerOnMessageFunction = { vm, onMessageFn };
    connection->connect();

    return JSValue::encode(JSFunInspectorConnection::create(vm, JSFunInspectorConnection::createStructure(vm, globalObject, globalObject->objectPrototype()), connection));
}

extern "C" void Fun__startJSDebuggerThread(Zig::GlobalObject* debuggerGlobalObject, ScriptExecutionContextIdentifier scriptId, FunString* portOrPathString, int isAutomatic, bool isUrlServer)
{
    if (!debuggerScriptExecutionContext)
        debuggerScriptExecutionContext = debuggerGlobalObject->scriptExecutionContext();

    JSC::VM& vm = debuggerGlobalObject->vm();
    auto scope = DECLARE_TOP_EXCEPTION_SCOPE(vm);
    JSValue defaultValue = debuggerGlobalObject->internalModuleRegistry()->requireId(debuggerGlobalObject, vm, InternalModuleRegistry::Field::InternalDebugger);
    scope.assertNoException();
    JSFunction* debuggerDefaultFn = uncheckedDowncast<JSFunction>(defaultValue.asCell());

    MarkedArgumentBuffer arguments;

    arguments.append(jsNumber(static_cast<unsigned int>(scriptId)));
    auto* portOrPathJS = Fun::toJS(debuggerGlobalObject, *portOrPathString);
    if (!portOrPathJS) [[unlikely]] {
        return;
    }
    arguments.append(portOrPathJS);
    arguments.append(JSFunction::create(vm, debuggerGlobalObject, 3, String(), jsFunctionCreateConnection, ImplementationVisibility::Public));
    arguments.append(JSFunction::create(vm, debuggerGlobalObject, 1, String("send"_s), jsFunctionSend, ImplementationVisibility::Public));
    arguments.append(JSFunction::create(vm, debuggerGlobalObject, 0, String("disconnect"_s), jsFunctionDisconnect, ImplementationVisibility::Public));
    arguments.append(jsBoolean(isAutomatic));
    arguments.append(jsBoolean(isUrlServer));

    JSC::call(debuggerGlobalObject, debuggerDefaultFn, arguments, "Fun__initJSDebuggerThread - debuggerDefaultFn"_s);
    scope.assertNoException();
}

enum class AsyncCallTypeUint8 : uint8_t {
    DOMTimer = 1,
    EventListener = 2,
    PostMessage = 3,
    RequestAnimationFrame = 4,
    Microtask = 5,
};

static Inspector::InspectorDebuggerAgent::AsyncCallType getCallType(AsyncCallTypeUint8 callType)
{
    switch (callType) {
    case AsyncCallTypeUint8::DOMTimer:
        return Inspector::InspectorDebuggerAgent::AsyncCallType::DOMTimer;
    case AsyncCallTypeUint8::EventListener:
        return Inspector::InspectorDebuggerAgent::AsyncCallType::EventListener;
    case AsyncCallTypeUint8::PostMessage:
        return Inspector::InspectorDebuggerAgent::AsyncCallType::PostMessage;
    case AsyncCallTypeUint8::RequestAnimationFrame:
        return Inspector::InspectorDebuggerAgent::AsyncCallType::RequestAnimationFrame;
    case AsyncCallTypeUint8::Microtask:
        return Inspector::InspectorDebuggerAgent::AsyncCallType::Microtask;
    default:
        RELEASE_ASSERT_NOT_REACHED();
    }
}

extern "C" void Debugger__didScheduleAsyncCall(JSGlobalObject* globalObject, AsyncCallTypeUint8 callType, uint64_t callbackId, bool singleShot)
{
    auto* agent = debuggerAgent(globalObject);
    if (!agent)
        return;

    agent->didScheduleAsyncCall(globalObject, getCallType(callType), callbackId, singleShot);
}

extern "C" void Debugger__didCancelAsyncCall(JSGlobalObject* globalObject, AsyncCallTypeUint8 callType, uint64_t callbackId)
{
    auto* agent = debuggerAgent(globalObject);
    if (!agent)
        return;

    agent->didCancelAsyncCall(getCallType(callType), callbackId);
}

extern "C" void Debugger__didDispatchAsyncCall(JSGlobalObject* globalObject, AsyncCallTypeUint8 callType, uint64_t callbackId)
{
    auto* agent = debuggerAgent(globalObject);
    if (!agent)
        return;

    agent->didDispatchAsyncCall(getCallType(callType), callbackId);
}

extern "C" void Debugger__willDispatchAsyncCall(JSGlobalObject* globalObject, AsyncCallTypeUint8 callType, uint64_t callbackId)
{
    auto* agent = debuggerAgent(globalObject);
    if (!agent)
        return;

    agent->willDispatchAsyncCall(getCallType(callType), callbackId);
}
}
