#include "root.h"

#include <JavaScriptCore/JSCell.h>
#include <JavaScriptCore/Structure.h>
#include <JavaScriptCore/JSObject.h>
#include "JSFunRequest.h"
#include "ZigGlobalObject.h"
#include "AsyncContextFrame.h"
#include <JavaScriptCore/ObjectConstructor.h>
#include "JSFetchHeaders.h"
#include "JSCookieMap.h"
#include "Cookie.h"
#include "CookieMap.h"
#include "ErrorCode.h"
#include "JSDOMExceptionHandling.h"
#include <fun-uws/src/App.h>

namespace Fun {

extern "C" SYSV_ABI JSC::EncodedJSValue Fun__JSRequest__createForBake(Zig::GlobalObject* globalObject, void* requestPtr)
{
    auto& vm = globalObject->vm();
    auto scope = DECLARE_THROW_SCOPE(vm);
    auto* structure = globalObject->m_JSFunRequestStructure.get(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    auto* paramsPrototype = globalObject->m_JSFunRequestParamsPrototype.get(globalObject);
    RETURN_IF_EXCEPTION(scope, {});

    // the params are passed into the page component as a prop so we'll make
    // this empty for now
    auto* emptyParams = JSC::constructEmptyObject(globalObject, paramsPrototype);
    RETURN_IF_EXCEPTION(scope, {});

    JSFunRequest* request
        = JSFunRequest::create(vm, structure, requestPtr, emptyParams);
    RETURN_IF_EXCEPTION(scope, {});

    return JSValue::encode(request);
}

static JSC_DECLARE_CUSTOM_GETTER(jsJSFunRequestGetParams);
static JSC_DECLARE_CUSTOM_GETTER(jsJSFunRequestGetCookies);

static JSC_DECLARE_HOST_FUNCTION(jsJSFunRequestClone);

extern "C" void Fun__JSRequest__calculateEstimatedByteSize(void* requestPtr);

static const HashTableValue JSFunRequestPrototypeValues[] = {
    { "params"_s, static_cast<unsigned>(JSC::PropertyAttribute::CustomAccessor | JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontDelete), NoIntrinsic, { HashTableValue::GetterSetterType, jsJSFunRequestGetParams, nullptr } },
    { "cookies"_s, static_cast<unsigned>(JSC::PropertyAttribute::CustomAccessor | JSC::PropertyAttribute::ReadOnly | JSC::PropertyAttribute::DontDelete), NoIntrinsic, { HashTableValue::GetterSetterType, jsJSFunRequestGetCookies, nullptr } },
    { "clone"_s, static_cast<unsigned>(JSC::PropertyAttribute::Function), NoIntrinsic, { HashTableValue::NativeFunctionType, jsJSFunRequestClone, 1 } }
};

JSFunRequest* JSFunRequest::create(JSC::VM& vm, JSC::Structure* structure, void* sinkPtr, JSObject* params)
{
    // Do this **extremely** early, before we create the JSValue.
    // We do not want to risk the GC running before this function is called.
    Fun__JSRequest__calculateEstimatedByteSize(sinkPtr);

    JSFunRequest* ptr = new (NotNull, JSC::allocateCell<JSFunRequest>(vm)) JSFunRequest(vm, structure, sinkPtr, params);
    ptr->finishCreation(vm);
    return ptr;
}

JSC::Structure* JSFunRequest::createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
{
    return JSC::Structure::create(vm, globalObject, prototype, JSC::TypeInfo(static_cast<JSC::JSType>(0b11101110), StructureFlags), info());
}

JSC::GCClient::IsoSubspace* JSFunRequest::subspaceForImpl(JSC::VM& vm)
{
    return WebCore::subspaceForImpl<JSFunRequest, WebCore::UseCustomHeapCellType::No>(
        vm,
        [](auto& spaces) { return spaces.m_clientSubspaceForFunRequest.get(); },
        [](auto& spaces, auto&& space) { spaces.m_clientSubspaceForFunRequest = std::forward<decltype(space)>(space); },
        [](auto& spaces) { return spaces.m_subspaceForFunRequest.get(); },
        [](auto& spaces, auto&& space) { spaces.m_subspaceForFunRequest = std::forward<decltype(space)>(space); });
}

JSObject* JSFunRequest::params() const
{
    if (m_params) {
        return m_params.get();
    }
    return nullptr;
}

void JSFunRequest::setParams(JSObject* params)
{
    m_params.set(Base::vm(), this, params);
}

JSObject* JSFunRequest::cookies() const
{
    return m_cookies.get();
}

extern "C" void* Request__clone(void* internalZigRequestPointer, JSGlobalObject* globalObject);

JSFunRequest* JSFunRequest::clone(JSC::VM& vm, JSGlobalObject* globalObject)
{
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto* structure = defaultGlobalObject(globalObject)->m_JSFunRequestStructure.getInitializedOnMainThread(globalObject);
    auto* raw = Request__clone(this->wrapped(), globalObject);
    EXCEPTION_ASSERT(!!raw == !throwScope.exception());
    RETURN_IF_EXCEPTION(throwScope, nullptr);
    auto* clone = this->create(vm, structure, raw, nullptr);

    // Cookies and params are deep copied as they can be changed between the clone and original
    if (auto* params = this->params()) {
        // TODO: Use JSC's internal `cloneObject()` if/when it's exposed
        // https://github.com/oven-sh/WebKit/blob/c5e9b9e327194f520af2c28679adb0ea1fa902ad/Source/JavaScriptCore/runtime/JSGlobalObjectFunctions.cpp#L1018-L1099
        auto* prototype = defaultGlobalObject(globalObject)->m_JSFunRequestParamsPrototype.get(globalObject);
        auto* paramsClone = JSC::constructEmptyObject(globalObject, prototype);

        auto propertyNames = PropertyNameArrayBuilder(vm, JSC::PropertyNameMode::Strings, JSC::PrivateSymbolMode::Exclude);
        JSObject::getOwnPropertyNames(params, globalObject, propertyNames, JSC::DontEnumPropertiesMode::Exclude);
        RETURN_IF_EXCEPTION(throwScope, nullptr);

        for (auto& property : propertyNames) {
            auto value = params->get(globalObject, property);
            RETURN_IF_EXCEPTION(throwScope, nullptr);
            paramsClone->putDirect(vm, property, value);
        }

        clone->setParams(paramsClone);
    }

    if (auto* cookiesObject = cookies()) {
        if (auto* wrapper = dynamicDowncast<JSCookieMap>(cookiesObject)) {
            auto cookieMap = wrapper->protectedWrapped();
            auto cookieMapClone = cookieMap->clone();
            auto cookies = WebCore::toJSNewlyCreated(globalObject, uncheckedDowncast<JSDOMGlobalObject>(globalObject), WTF::move(cookieMapClone));
            clone->setCookies(cookies.getObject());
        }
    }

    RELEASE_AND_RETURN(throwScope, clone);
}

extern "C" void Request__setCookiesOnRequestContext(void* internalZigRequestPointer, CookieMap* cookieMap);

void JSFunRequest::setCookies(JSObject* cookies)
{
    m_cookies.set(Base::vm(), this, cookies);
    Request__setCookiesOnRequestContext(this->wrapped(), WebCoreCast<WebCore::JSCookieMap, WebCore::CookieMap>(JSValue::encode(cookies)));
}

JSFunRequest::JSFunRequest(JSC::VM& vm, JSC::Structure* structure, void* sinkPtr, JSC::JSObject* params)
    : Base(vm, structure, sinkPtr)
    , m_params(params, JSC::WriteBarrierEarlyInit)
    , m_cookies(nullptr, JSC::WriteBarrierEarlyInit)
{
}
extern SYSV_ABI "C" size_t Request__estimatedSize(void* requestPtr);
extern "C" void Fun__JSRequest__calculateEstimatedByteSize(void* requestPtr);
void JSFunRequest::finishCreation(JSC::VM& vm)
{
    Base::finishCreation(vm);

    auto size = Request__estimatedSize(this->wrapped());
    vm.heap.reportExtraMemoryAllocated(this, size);
}

template<typename Visitor>
void JSFunRequest::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    JSFunRequest* thisCallSite = uncheckedDowncast<JSFunRequest>(cell);
    Base::visitChildren(thisCallSite, visitor);
    visitor.append(thisCallSite->m_params);
    visitor.append(thisCallSite->m_cookies);
}

DEFINE_VISIT_CHILDREN(JSFunRequest);

class JSFunRequestPrototype final : public JSNonFinalObject {
public:
    using Base = JSNonFinalObject;

    static JSFunRequestPrototype* create(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::Structure* structure)
    {
        auto* ptr = new (NotNull, JSC::allocateCell<JSFunRequestPrototype>(vm)) JSFunRequestPrototype(vm, structure);
        ptr->finishCreation(vm, globalObject);
        return ptr;
    }

    static Structure* createStructure(JSC::VM& vm, JSC::JSGlobalObject* globalObject, JSC::JSValue prototype)
    {
        auto* structure = Structure::create(vm, globalObject, prototype, JSC::TypeInfo(JSC::ObjectType, StructureFlags), info(), NonArray);
        structure->setMayBePrototype(true);
        return structure;
    }

    DECLARE_INFO;

    template<typename CellType, JSC::SubspaceAccess>
    static JSC::GCClient::IsoSubspace* subspaceFor(JSC::VM& vm)
    {
        STATIC_ASSERT_ISO_SUBSPACE_SHARABLE(JSFunRequestPrototype, Base);
        return &vm.plainObjectSpace();
    }

private:
    JSFunRequestPrototype(JSC::VM& vm, JSC::Structure* structure)
        : Base(vm, structure)
    {
    }

    void finishCreation(JSC::VM& vm, JSC::JSGlobalObject* globalObject)
    {
        Base::finishCreation(vm);
        reifyStaticProperties(vm, JSFunRequest::info(), JSFunRequestPrototypeValues, *this);
        JSC_TO_STRING_TAG_WITHOUT_TRANSITION();
    }
};

const JSC::ClassInfo JSFunRequestPrototype::s_info = { "FunRequest"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFunRequestPrototype) };
const JSC::ClassInfo JSFunRequest::s_info = { "FunRequest"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(JSFunRequest) };

JSC_DEFINE_CUSTOM_GETTER(jsJSFunRequestGetParams, (JSC::JSGlobalObject * globalObject, JSC::EncodedJSValue thisValue, JSC::PropertyName))
{
    JSFunRequest* request = dynamicDowncast<JSFunRequest>(JSValue::decode(thisValue));
    if (!request)
        return JSValue::encode(jsUndefined());

    auto* params = request->params();
    if (!params) {
        auto* prototype = defaultGlobalObject(globalObject)->m_JSFunRequestParamsPrototype.get(globalObject);
        params = JSC::constructEmptyObject(globalObject, prototype);
        request->setParams(params);
    }

    return JSValue::encode(params);
}

JSC_DEFINE_CUSTOM_GETTER(jsJSFunRequestGetCookies, (JSC::JSGlobalObject * globalObject, JSC::EncodedJSValue thisValue, JSC::PropertyName))
{
    JSFunRequest* request = dynamicDowncast<JSFunRequest>(JSValue::decode(thisValue));
    if (!request)
        return JSValue::encode(jsUndefined());

    auto* cookies = request->cookies();
    if (!cookies) {
        auto& vm = globalObject->vm();
        auto throwScope = DECLARE_THROW_SCOPE(vm);
        auto& names = builtinNames(vm);
        JSC::JSValue headersValue = request->get(globalObject, names.headersPublicName());
        RETURN_IF_EXCEPTION(throwScope, encodedJSValue());
        auto* headers = dynamicDowncast<WebCore::JSFetchHeaders>(headersValue);
        if (!headers) return JSValue::encode(jsUndefined());

        auto& fetchHeaders = headers->wrapped();

        auto cookieHeader = fetchHeaders.internalHeaders().get(HTTPHeaderName::Cookie);

        // Create a CookieMap from the cookie header
        auto cookieMapResult = WebCore::CookieMap::create(cookieHeader);
        RETURN_IF_EXCEPTION(throwScope, encodedJSValue());
        if (cookieMapResult.hasException()) {
            WebCore::propagateException(*globalObject, throwScope, cookieMapResult.releaseException());
            RELEASE_AND_RETURN(throwScope, {});
        }

        auto cookieMap = cookieMapResult.releaseReturnValue();

        // Convert to JS
        auto cookies = WebCore::toJSNewlyCreated(globalObject, uncheckedDowncast<JSDOMGlobalObject>(globalObject), WTF::move(cookieMap));
        RETURN_IF_EXCEPTION(throwScope, encodedJSValue());
        request->setCookies(cookies.getObject());
        return JSValue::encode(cookies);
    }

    return JSValue::encode(cookies);
}

JSC_DEFINE_HOST_FUNCTION(jsJSFunRequestClone, (JSC::JSGlobalObject * globalObject, JSC::CallFrame* callFrame))
{
    auto& vm = globalObject->vm();
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto* request = dynamicDowncast<JSFunRequest>(callFrame->thisValue());
    if (!request) {
        throwScope.throwException(globalObject, Fun::createInvalidThisError(globalObject, request, "FunRequest"));
        RETURN_IF_EXCEPTION(throwScope, {});
    }

    auto clone = request->clone(vm, globalObject);
    RETURN_IF_EXCEPTION(throwScope, {});
    return JSValue::encode(clone);
}

Structure* createJSFunRequestStructure(JSC::VM& vm, Zig::GlobalObject* globalObject)
{
    auto prototypeStructure = JSFunRequestPrototype::createStructure(vm, globalObject, globalObject->JSRequestPrototype());
    auto* prototype = JSFunRequestPrototype::create(vm, globalObject, prototypeStructure);
    return JSFunRequest::createStructure(vm, globalObject, prototype);
}

extern "C" EncodedJSValue Fun__getParamsIfFunRequest(JSC::EncodedJSValue thisValue)
{
    if (auto* request = dynamicDowncast<JSFunRequest>(JSValue::decode(thisValue))) {
        auto* params = request->params();
        if (!params) {
            return JSValue::encode(jsUndefined());
        }

        return JSValue::encode(params);
    }

    return {};
}

} // namespace Fun
