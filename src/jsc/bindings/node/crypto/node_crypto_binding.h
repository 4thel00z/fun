
#pragma once

#include "root.h"
#include "helpers.h"
#include "ncrypto.h"

namespace Fun {

JSC::JSValue createNodeCryptoBinding(Zig::GlobalObject* globalObject);

} // namespace Fun
