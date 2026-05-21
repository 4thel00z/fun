#pragma once

namespace Fun {
bool isBuiltinModule(const String& namePossiblyWithNodePrefix);
String isUnprefixedNodeBuiltin(const String& name);
} // namespace Fun
