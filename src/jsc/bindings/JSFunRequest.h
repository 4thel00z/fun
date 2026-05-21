#pragma once

#include "JSCookieMap.h"
#include "root.h"
#include "ZigGeneratedClasses.h"

namespace Fun {
using namespace JSC;
using namespace WebCore;

class JSFunRequest : public JSRequest {
public:
    using Base = JSRequest;

    static JSFunRequest* create(JSC::VM& vm, JSC::Structure* structure, void* sinkPtr, JSObject* params);
    static JSC::Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype);

    template<typename, JSC::SubspaceAccess mode>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        if (mode == JSC::SubspaceAccess::Concurrently) {
            return nullptr;
        }

        return subspaceForImpl(vm);
    }

    static JSC::GCClient::IsoSubspace* subspaceForImpl(JSC::VM& vm);

    DECLARE_VISIT_CHILDREN;
    DECLARE_INFO;

    JSObject* params() const;
    void setParams(JSObject* params);

    JSObject* cookies() const;
    void setCookies(JSObject* cookies);

    JSFunRequest* clone(JSC::VM& vm, JSGlobalObject* globalObject);

private:
    JSFunRequest(JSC::VM& vm, JSC::Structure* structure, void* sinkPtr, JSC::JSObject* params);
    void finishCreation(JSC::VM& vm);

    mutable JSC::WriteBarrier<JSC::JSObject> m_params;
    mutable JSC::WriteBarrier<JSC::JSObject> m_cookies;
};

JSC::Structure* createJSFunRequestStructure(JSC::VM&, Zig::GlobalObject*);

} // namespace Fun
