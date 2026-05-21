#ifndef FUN_NATIVE_FUNDLER_PLUGIN_API_H
#define FUN_NATIVE_FUNDLER_PLUGIN_API_H

#include <stddef.h>
#include <stdint.h>

typedef enum {
  FUN_LOADER_JSX = 0,
  FUN_LOADER_JS = 1,
  FUN_LOADER_TS = 2,
  FUN_LOADER_TSX = 3,
  FUN_LOADER_CSS = 4,
  FUN_LOADER_FILE = 5,
  FUN_LOADER_JSON = 6,
  FUN_LOADER_TOML = 7,
  FUN_LOADER_WASM = 8,
  FUN_LOADER_NAPI = 9,
  FUN_LOADER_BASE64 = 10,
  FUN_LOADER_DATAURL = 11,
  FUN_LOADER_TEXT = 12,
} FunLoader;

const FunLoader FUN_LOADER_MAX = FUN_LOADER_TEXT;

typedef struct FunLogOptions {
  size_t __struct_size;
  const uint8_t *message_ptr;
  size_t message_len;
  const uint8_t *path_ptr;
  size_t path_len;
  const uint8_t *source_line_text_ptr;
  size_t source_line_text_len;
  int8_t level;
  int line;
  int lineEnd;
  int column;
  int columnEnd;
} FunLogOptions;

typedef struct {
  size_t __struct_size;
  void *fun;
  const uint8_t *path_ptr;
  size_t path_len;
  const uint8_t *namespace_ptr;
  size_t namespace_len;
  uint8_t default_loader;
  void *external;
} OnBeforeParseArguments;

typedef struct OnBeforeParseResult {
  size_t __struct_size;
  uint8_t *source_ptr;
  size_t source_len;
  uint8_t loader;
  int (*fetchSourceCode)(const OnBeforeParseArguments *args,
                         struct OnBeforeParseResult *result);
  void *plugin_source_code_context;
  void (*free_plugin_source_code_context)(void *ctx);
  void (*log)(const OnBeforeParseArguments *args, FunLogOptions *options);
} OnBeforeParseResult;

typedef enum {
  FUN_LOG_LEVEL_VERBOSE = 0,
  FUN_LOG_LEVEL_DEBUG = 1,
  FUN_LOG_LEVEL_INFO = 2,
  FUN_LOG_LEVEL_WARN = 3,
  FUN_LOG_LEVEL_ERROR = 4,
} FunLogLevel;

const FunLogLevel FUN_LOG_MAX = FUN_LOG_LEVEL_ERROR;

#endif // FUN_NATIVE_FUNDLER_PLUGIN_API_H
