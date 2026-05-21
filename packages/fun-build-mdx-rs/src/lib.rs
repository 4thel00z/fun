use fun_native_plugin::{anyhow, fun, define_fun_plugin, FunLoader, Result};
use mdxjs::{compile, Options as CompileOptions};
use napi_derive::napi;

define_fun_plugin!("fun-mdx-rs");

#[fun]
pub fn fun_mdx_rs(handle: &mut OnBeforeParse) -> Result<()> {
  let source_str = handle.input_source_code()?;

  let mut options = CompileOptions::gfm();

  // Leave it as JSX for Fun to handle
  options.jsx = true;

  let path = handle.path()?;
  options.filepath = Some(path.to_string());

  let jsx = compile(&source_str, &options)
    .map_err(|e| anyhow::anyhow!("Failed to compile MDX: {:?}", e))?;

  handle.set_output_source_code(jsx, FunLoader::FUN_LOADER_JSX);

  Ok(())
}
