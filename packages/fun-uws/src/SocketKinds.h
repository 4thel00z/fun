#pragma once
/* `src/deps/uws/SocketKind.zig` is the source of truth for these ordinals.
 * The Zig side `@export`s them so the dispatch ABI can't silently drift if
 * the enum is reordered — C++ links against the actual values instead of
 * hand-mirrored literals. */
extern "C" const unsigned char FUN_SOCKET_KIND_DYNAMIC;
extern "C" const unsigned char FUN_SOCKET_KIND_UWS_HTTP;
extern "C" const unsigned char FUN_SOCKET_KIND_UWS_HTTP_TLS;
extern "C" const unsigned char FUN_SOCKET_KIND_UWS_WS;
extern "C" const unsigned char FUN_SOCKET_KIND_UWS_WS_TLS;

#define US_SOCKET_KIND_DYNAMIC      FUN_SOCKET_KIND_DYNAMIC
#define US_SOCKET_KIND_UWS_HTTP     FUN_SOCKET_KIND_UWS_HTTP
#define US_SOCKET_KIND_UWS_HTTP_TLS FUN_SOCKET_KIND_UWS_HTTP_TLS
#define US_SOCKET_KIND_UWS_WS       FUN_SOCKET_KIND_UWS_WS
#define US_SOCKET_KIND_UWS_WS_TLS   FUN_SOCKET_KIND_UWS_WS_TLS
