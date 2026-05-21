#pragma once

#include "root.h"
#include "headers-handwritten.h"
#include <JavaScriptCore/JSGlobalObject.h>
#include <JavaScriptCore/Strong.h>
#include "helpers.h"

FUN_DECLARE_HOST_FUNCTION(jsFunctionFunPlugin);
FUN_DECLARE_HOST_FUNCTION(jsFunctionFunPluginClear);

namespace Zig {

using namespace JSC;

class FunPlugin {
public:
    using VirtualModuleMap = WTF::UncheckedKeyHashMap<String, JSC::Strong<JSC::JSObject>>;

    // This is a list of pairs of regexps and functions to match against
    class Group {

    public:
        // JavaScriptCore/RegularExpression does exist however it does not JIT
        // We want JIT!
        // TODO: evaluate if using JSInternalFieldImpl(2) is faster
        Vector<JSC::Strong<JSC::RegExp>> filters = {};
        Vector<JSC::Strong<JSC::JSObject>> callbacks = {};
        FunPluginTarget target { FunPluginTargetFun };

        void append(JSC::VM& vm, JSC::RegExp* filter, JSC::JSObject* func);
        JSObject* find(JSC::JSGlobalObject* globalObj, String& path);
        void clear()
        {
            filters.clear();
            callbacks.clear();
        }
    };

    class Base {
    public:
        Group fileNamespace = {};
        Vector<String> namespaces = {};
        Vector<Group> groups = {};

        Group* group(const String& namespaceStr)
        {
            if (namespaceStr.isEmpty()) {
                return &fileNamespace;
            }

            for (size_t i = 0; i < namespaces.size(); i++) {
                if (namespaces[i] == namespaceStr) {
                    return &groups[i];
                }
            }

            return nullptr;
        }

        void append(JSC::VM& vm, JSC::RegExp* filter, JSC::JSObject* func, String& namespaceString);
    };

    class OnLoad final : public Base {

    public:
        OnLoad()
            : Base()
        {
        }

        VirtualModuleMap* _Nullable virtualModules = nullptr;
        bool mustDoExpensiveRelativeLookup = false;
        JSC::EncodedJSValue run(JSC::JSGlobalObject* globalObject, FunString* namespaceString, FunString* path);

        bool hasVirtualModules() const { return virtualModules != nullptr; }

        void addModuleMock(JSC::VM& vm, const String& path, JSC::JSObject* mock);

        std::optional<String> resolveVirtualModule(const String& path, const String& from);

        ~OnLoad()
        {
            if (virtualModules) {
                delete virtualModules;
            }
        }
    };

    class OnResolve final : public Base {

    public:
        OnResolve()
            : Base()
        {
        }

        JSC::EncodedJSValue run(JSC::JSGlobalObject* globalObject, FunString* namespaceString, FunString* path, FunString* importer);
    };
};

class GlobalObject;

} // namespace Zig

namespace Fun {
JSC::JSValue runVirtualModule(Zig::GlobalObject*, FunString* specifier, bool& wasModuleMock);
JSC::Structure* createModuleMockStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype);
}
