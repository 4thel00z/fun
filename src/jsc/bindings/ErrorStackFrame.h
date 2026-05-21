#include "root.h"
#include "headers-handwritten.h"
#include "JavaScriptCore/BytecodeIndex.h"

namespace Fun {

ZigStackFramePosition getAdjustedPositionForBytecode(JSC::CodeBlock* code, JSC::BytecodeIndex bc);

} // namespace Fun
