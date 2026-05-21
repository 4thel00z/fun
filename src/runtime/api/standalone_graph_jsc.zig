//! JSC bridges for `StandaloneModuleGraph.File`. The graph itself stays in
//! `standalone_graph/` (used by the bundler with no JS in the loop); only the
//! `Blob` accessor that needs a `*JSGlobalObject` lives here.

pub fn fileBlob(this: *File, globalObject: *fun.jsc.JSGlobalObject) *fun.webcore.Blob {
    if (this.cached_blob == null) {
        const store = fun.webcore.Blob.Store.init(@constCast(this.contents), fun.default_allocator);
        // make it never free
        store.ref();

        const b = fun.webcore.Blob.initWithStore(store, globalObject).new();

        if (fun.http.MimeType.byExtensionNoDefault(fun.strings.trimLeadingChar(std.fs.path.extension(this.name), '.'))) |mime| {
            store.mime_type = mime;
            b.content_type = mime.value;
            b.content_type_was_set = true;
            b.content_type_allocated = false;
        }

        // The real name goes here:
        store.data.bytes.stored_name = fun.PathString.init(this.name);

        // The pretty name goes here:
        if (strings.hasPrefixComptime(this.name, fun.StandaloneModuleGraph.base_public_path_with_default_suffix)) {
            b.name = fun.String.cloneUTF8(this.name[fun.StandaloneModuleGraph.base_public_path_with_default_suffix.len..]);
        } else if (this.name.len > 0) {
            b.name = fun.String.cloneUTF8(this.name);
        }

        this.cached_blob = b;
    }

    return this.cached_blob.?;
}

const std = @import("std");

const fun = @import("fun");
const strings = fun.strings;
const File = fun.StandaloneModuleGraph.File;
