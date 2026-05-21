#pragma once
#include <JavaScriptCore/InjectedScriptHost.h>

namespace Fun {

class FunInjectedScriptHost final : public Inspector::InjectedScriptHost {
public:
    static Ref<FunInjectedScriptHost> create() { return adoptRef(*new FunInjectedScriptHost); }

    JSC::JSValue subtype(JSC::JSGlobalObject*, JSC::JSValue) override;
    JSC::JSValue getInternalProperties(JSC::VM&, JSC::JSGlobalObject*, JSC::JSValue) override;
    bool isHTMLAllCollection(JSC::VM&, JSC::JSValue) override { return false; }
};

}
