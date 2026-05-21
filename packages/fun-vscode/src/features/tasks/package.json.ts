/**
 * Automatically generates tasks from package.json scripts.
 */
import * as vscode from "vscode";
import { debugCommand } from "../debug";
import { FunTask } from "./tasks";

/**
 * Parses tasks defined in the package.json.
 */
export async function providePackageJsonTasks(): Promise<FunTask[]> {
  //
  const scripts: Record<string, string> = await (async () => {
    try {
      const file = vscode.Uri.file(vscode.workspace.workspaceFolders[0]?.uri.fsPath + "/package.json");

      // Load contents of package.json, no need to check if file exists, we return null if it doesn't
      const contents = await vscode.workspace.fs.readFile(file);
      return JSON.parse(contents.toString()).scripts;
    } catch {
      return null;
    }
  })();
  if (!scripts) return [];

  return Object.entries(scripts).map(([name, script]) => {
    // Prefix script with fun if it doesn't already start with fun
    const shellCommand = script.startsWith("fun run ") ? script : `fun run ${script}`;

    const task = new FunTask({
      script,
      name,
      detail: `${shellCommand} - package.json`,
      execution: new vscode.ShellExecution(shellCommand),
    });
    return task;
  });
}

export function registerPackageJsonProviders(context: vscode.ExtensionContext) {
  registerCodeLensProvider(context);
  registerHoverProvider(context);
}

/**
 * Utility function to extract the scripts from a package.json file, including their name and position in the document.
 */
function extractScriptsFromPackageJson(document: vscode.TextDocument) {
  const content = document.getText();
  const matches = content.match(/"scripts"\s*:\s*{([\s\S]*?)}/);
  if (!matches || matches.length < 2) return null;

  const startIndex = content.indexOf(matches[0]);
  const endIndex = startIndex + matches[0].length;
  const range = new vscode.Range(document.positionAt(startIndex), document.positionAt(endIndex));

  const scripts = matches[1].split(/,\s*/).map(script => {
    const elements = script.match(/"([^"\\]|\\.|\\\n)*"/g);
    if (elements?.length != 2) return null;
    const [name, command] = elements;
    return {
      name: name.replace('"', "").trim(),
      command: command.replace(/(?<!\\)"/g, "").trim(),
      range: new vscode.Range(
        document.positionAt(startIndex + matches[0].indexOf(name)),
        document.positionAt(startIndex + matches[0].indexOf(name) + name.length + command.length),
      ),
    };
  });

  return {
    range,
    scripts,
  };
}

/**
 * This function registers a CodeLens provider for package.json files. It is used to display the "Run" and "Debug" buttons
 * above the scripts properties in package.json (inline).
 */
function registerCodeLensProvider(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    // Register CodeLens provider for package.json files
    vscode.languages.registerCodeLensProvider(
      {
        language: "json",
        scheme: "file",
        pattern: "**/package.json",
      },
      {
        provideCodeLenses(document: vscode.TextDocument) {
          const { range } = extractScriptsFromPackageJson(document);

          const codeLenses: vscode.CodeLens[] = [];
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: "$(breakpoints-view-icon) Fun: Debug",
              tooltip: "Debug a script using fun",
              command: "extension.fun.codelens.run",
              arguments: [{ type: "debug" }],
            }),
            new vscode.CodeLens(range, {
              title: "$(debug-start) Fun: Run",
              tooltip: "Run a script using fun",
              command: "extension.fun.codelens.run",
              arguments: [{ type: "run" }],
            }),
          );
          return codeLenses;
        },
        resolveCodeLens(codeLens) {
          return codeLens;
        },
      },
    ),
    // Register the commands that are executed when clicking the CodeLens buttons
    vscode.commands.registerCommand("extension.fun.codelens.run", async ({ type }: { type: "debug" | "run" }) => {
      const tasks = (await vscode.tasks.fetchTasks({ type: "fun" })) as FunTask[];
      if (tasks.length === 0) return;

      const pick = await vscode.window.showQuickPick(
        tasks
          .filter(task => task.detail.endsWith("package.json"))
          .map(task => ({
            label: task.name,
            detail: task.detail,
          })),
      );
      if (!pick) return;

      const task = tasks.find(task => task.name === pick.label);
      if (!task) return;

      const command = type === "debug" ? "extension.fun.codelens.debug.task" : "extension.fun.codelens.run.task";

      vscode.commands.executeCommand(command, {
        script: task.definition.script,
        name: task.name,
      });
    }),
  );
}

function getActiveTerminal(name: string) {
  return vscode.window.terminals.filter(terminal => terminal.name === name);
}

interface CommandArgs {
  script: string;
  name: string;
}

/**
 * This function registers a Hover language feature provider for package.json files. It is used to display the
 * "Run" and "Debug" buttons when hovering over a script property in package.json.
 */
function registerHoverProvider(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerHoverProvider("json", {
      provideHover(document, position) {
        const { scripts } = extractScriptsFromPackageJson(document);

        return {
          contents: scripts.map(script => {
            if (!script.range.contains(position)) return null;

            const command = encodeURI(JSON.stringify({ script: script.command, name: script.name }));

            const markdownString = new vscode.MarkdownString(
              `[Debug](command:extension.fun.codelens.debug.task?${command}) | [Run](command:extension.fun.codelens.run.task?${command})`,
            );
            markdownString.isTrusted = true;

            return markdownString;
          }),
        };
      },
    }),
    vscode.commands.registerCommand("extension.fun.codelens.debug.task", async ({ script, name }: CommandArgs) => {
      if (script.startsWith("fun run ")) script = script.slice(8);
      if (script.startsWith("fun ")) script = script.slice(4);

      debugCommand(script);
    }),
    vscode.commands.registerCommand("extension.fun.codelens.run.task", async ({ script, name }: CommandArgs) => {
      if (script.startsWith("fun run ")) script = script.slice(8);

      name = `Fun Task: ${name}`;
      const terminals = getActiveTerminal(name);
      if (terminals.length > 0) {
        terminals[0].show();
        terminals[0].sendText(`fun run ${script}`);
        return;
      }

      const terminal = vscode.window.createTerminal({ name });
      terminal.show();
      terminal.sendText(`fun run ${script}`);
    }),
  );
}
