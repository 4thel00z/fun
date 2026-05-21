#include "InspectorFunFrontendDevServerAgent.h"

#include <JavaScriptCore/InspectorFrontendRouter.h>
#include <JavaScriptCore/InspectorBackendDispatcher.h>
#include <JavaScriptCore/JSGlobalObject.h>
#include <wtf/text/WTFString.h>
#include <JavaScriptCore/ScriptCallStackFactory.h>
#include <JavaScriptCore/ScriptArguments.h>
#include <JavaScriptCore/ConsoleMessage.h>
#include <JavaScriptCore/InspectorConsoleAgent.h>
#include <JavaScriptCore/JSGlobalObjectDebuggable.h>
#include <JavaScriptCore/JSGlobalObjectInspectorController.h>
#include <wtf/TZoneMallocInlines.h>
#include "ZigGlobalObject.h"

namespace Inspector {

extern "C" void Fun__InspectorFunFrontendDevServerAgent__setEnabled(Inspector::InspectorFunFrontendDevServerAgent*);

WTF_MAKE_TZONE_ALLOCATED_IMPL(InspectorFunFrontendDevServerAgent);

InspectorFunFrontendDevServerAgent::InspectorFunFrontendDevServerAgent(JSC::JSGlobalObject& globalObject)
    : InspectorAgentBase("BunFrontendDevServer"_s)
    // , m_globalobject(globalObject)
    , m_backendDispatcher(BunFrontendDevServerBackendDispatcher::create(globalObject.inspectorController().backendDispatcher(), this))
    , m_frontendDispatcher(makeUnique<BunFrontendDevServerFrontendDispatcher>(const_cast<FrontendRouter&>(globalObject.inspectorController().frontendRouter())))
    , m_enabled(false)
{
    UNUSED_PARAM(globalObject);
}

InspectorFunFrontendDevServerAgent::~InspectorFunFrontendDevServerAgent() = default;

void InspectorFunFrontendDevServerAgent::didCreateFrontendAndBackend()
{
}

void InspectorFunFrontendDevServerAgent::willDestroyFrontendAndBackend(DisconnectReason)
{
    m_frontendDispatcher = nullptr;
    m_enabled = false;
}

Protocol::ErrorStringOr<void> InspectorFunFrontendDevServerAgent::enable()
{
    if (m_enabled)
        return {};

    m_enabled = true;
    Fun__InspectorFunFrontendDevServerAgent__setEnabled(this);
    return {};
}

Protocol::ErrorStringOr<void> InspectorFunFrontendDevServerAgent::disable()
{
    if (!m_enabled)
        return {};

    m_enabled = false;
    Fun__InspectorFunFrontendDevServerAgent__setEnabled(nullptr);
    return {};
}

void InspectorFunFrontendDevServerAgent::clientConnected(int devServerId, int connectionId)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->clientConnected(devServerId, connectionId);
}

void InspectorFunFrontendDevServerAgent::clientDisconnected(int devServerId, int connectionId)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->clientDisconnected(devServerId, connectionId);
}

void InspectorFunFrontendDevServerAgent::bundleStart(int devServerId, Ref<JSON::ArrayOf<String>>&& triggerFiles)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->bundleStart(devServerId, WTF::move(triggerFiles));
}

void InspectorFunFrontendDevServerAgent::bundleComplete(int devServerId, double durationMs)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->bundleComplete(devServerId, durationMs);
}

void InspectorFunFrontendDevServerAgent::bundleFailed(int devServerId, const String& buildErrorsPayloadBase64)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->bundleFailed(devServerId, buildErrorsPayloadBase64);
}

void InspectorFunFrontendDevServerAgent::clientNavigated(int devServerId, int connectionId, const String& url, std::optional<int> routeBundleId)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->clientNavigated(devServerId, connectionId, url, WTF::move(routeBundleId));
}

void InspectorFunFrontendDevServerAgent::clientErrorReported(int devServerId, const String& clientErrorPayloadBase64)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->clientErrorReported(devServerId, clientErrorPayloadBase64);
}

void InspectorFunFrontendDevServerAgent::graphUpdate(int devServerId, const String& visualizerPayloadBase64)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    // m_frontendDispatcher->graphUpdate(devServerId, visualizerPayloadBase64);
}

void InspectorFunFrontendDevServerAgent::consoleLog(int devServerId, char kind, const String& data)
{
    if (!m_enabled || !m_frontendDispatcher)
        return;

    m_frontendDispatcher->consoleLog(devServerId, kind, data);
}

// C API implementations for Zig
extern "C" {

void InspectorFunFrontendDevServerAgent__notifyClientConnected(InspectorFunFrontendDevServerAgent* agent, int devServerId, int connectionId)
{
    agent->clientConnected(devServerId, connectionId);
}

void InspectorFunFrontendDevServerAgent__notifyClientDisconnected(InspectorFunFrontendDevServerAgent* agent, int devServerId, int connectionId)
{
    agent->clientDisconnected(devServerId, connectionId);
}

void InspectorFunFrontendDevServerAgent__notifyBundleStart(InspectorFunFrontendDevServerAgent* agent, int devServerId, FunString* triggerFiles, size_t triggerFilesLen)
{
    // Create a JSON array for the triggerFiles
    Ref<JSON::ArrayOf<String>> files = JSON::ArrayOf<String>::create();
    for (size_t i = 0; i < triggerFilesLen; i++) {
        files->addItem(triggerFiles[i].transferToWTFString());
    }

    agent->bundleStart(devServerId, WTF::move(files));
}

void InspectorFunFrontendDevServerAgent__notifyBundleComplete(InspectorFunFrontendDevServerAgent* agent, int devServerId, double durationMs)
{
    agent->bundleComplete(devServerId, durationMs);
}

void InspectorFunFrontendDevServerAgent__notifyBundleFailed(InspectorFunFrontendDevServerAgent* agent, int devServerId, FunString* buildErrorsPayloadBase64)
{
    agent->bundleFailed(devServerId, buildErrorsPayloadBase64->transferToWTFString());
}

void InspectorFunFrontendDevServerAgent__notifyClientNavigated(InspectorFunFrontendDevServerAgent* agent, int devServerId, int connectionId, FunString* url, int routeBundleId)
{
    std::optional<int> optionalRouteBundleId;
    if (routeBundleId > -1) {
        optionalRouteBundleId = { routeBundleId };
    }

    agent->clientNavigated(devServerId, connectionId, url->toWTFString(), optionalRouteBundleId);
}

void InspectorFunFrontendDevServerAgent__notifyClientErrorReported(InspectorFunFrontendDevServerAgent* agent, int devServerId, FunString* clientErrorPayloadBase64)
{
    agent->clientErrorReported(devServerId, clientErrorPayloadBase64->toWTFString());
}

void InspectorFunFrontendDevServerAgent__notifyGraphUpdate(InspectorFunFrontendDevServerAgent* agent, int devServerId, FunString* visualizerPayloadBase64)
{
    agent->graphUpdate(devServerId, visualizerPayloadBase64->toWTFString());
}

void InspectorFunFrontendDevServerAgent__notifyConsoleLog(InspectorFunFrontendDevServerAgent* agent, int devServerId, char kind, FunString* data)
{
    agent->consoleLog(devServerId, kind, data->toWTFString());
}
}

} // namespace Inspector
