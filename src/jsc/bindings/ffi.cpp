#include "root.h"

typedef struct FFIFields {
    uint32_t JSArrayBufferView__offsetOfLength;
    uint32_t JSArrayBufferView__offsetOfByteOffset;
    uint32_t JSArrayBufferView__offsetOfVector;
    uint32_t JSCell__offsetOfType;
} FFIFields;
extern "C" FFIFields Fun__FFI__offsets = { 0 };

extern "C" void Fun__FFI__ensureOffsetsAreLoaded()
{
    Fun__FFI__offsets.JSArrayBufferView__offsetOfLength = JSC::JSArrayBufferView::offsetOfLength();
    Fun__FFI__offsets.JSArrayBufferView__offsetOfByteOffset = JSC::JSArrayBufferView::offsetOfByteOffset();
    Fun__FFI__offsets.JSArrayBufferView__offsetOfVector = JSC::JSArrayBufferView::offsetOfVector();
    Fun__FFI__offsets.JSCell__offsetOfType = JSC::JSCell::typeInfoTypeOffset();
}
