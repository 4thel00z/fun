import { spawn } from "node:child_process";
import * as vscode from "vscode";
import { getConfig } from "../../extension";
import { styleLockfile } from "./lockfile.style";

export type FunLockfile = vscode.CustomDocument & {
  readonly preview: string;
};

export class FunLockfileEditorProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(private context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken,
  ): Promise<FunLockfile> {
    const preview = await previewLockfile(uri, token);
    return {
      uri,
      preview,
      dispose() {},
    };
  }

  async resolveCustomEditor(
    document: FunLockfile,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const { preview } = document;
    webviewPanel.webview.options = {
      localResourceRoots: [this.context.extensionUri],
    };
    renderLockfile(webviewPanel, preview, this.context.extensionUri);
  }
}

function renderLockfile({ webview }: vscode.WebviewPanel, preview: string, extensionUri: vscode.Uri): void {
  if (!getConfig("funlockb.enabled")) {
    webview.html = "<code>fun.funlockb</code> config option is disabled.";
    return;
  }

  const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "assets", "vscode.css"));
  const lockfileContent = styleLockfile(preview);

  const lineNumbers: string[] = [];
  for (let i = 0; i < lockfileContent.split("\n").length; i++) {
    lineNumbers.push(`<span class="line-number">${i + 1}</span>`);
  }

  webview.html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleVSCodeUri}" rel="stylesheet" />
  </head>
  <body>
    <div class="funlock">
      <div class="lines">
        ${lineNumbers.join("\n")}
      </div>
      <code>${lockfileContent}</code>
    </div>
  </body>
</html>`;
}

function previewLockfile(uri: vscode.Uri, token?: vscode.CancellationToken): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn("fun", [uri.fsPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    token?.onCancellationRequested(() => {
      process.kill();
    });
    let stdout = "";
    process.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    let stderr = "";
    process.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    process.on("error", error => {
      reject(error);
    });
    process.on("exit", code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Fun exited with code: ${code}\n${stderr}`));
      }
    });
  });
}

export function registerBunlockEditor(context: vscode.ExtensionContext): void {
  const viewType = "fun.lockb";
  const provider = new FunLockfileEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(viewType, provider, {
      supportsMultipleEditorsPerDocument: true,
      webviewOptions: {
        enableFindWidget: true,
        retainContextWhenHidden: true,
      },
    }),
  );
}
