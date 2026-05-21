import * as vscode from "vscode";
import { FunTestController, debug } from "./fun-test-controller";

export async function registerTests(context: vscode.ExtensionContext) {
  const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
  if (!workspaceFolder) {
    return;
  }

  const config = vscode.workspace.getConfiguration("fun.test");
  const enable = config.get<boolean>("enable", true);
  if (!enable) {
    return;
  }

  try {
    const controller = vscode.tests.createTestController("fun", "Fun Tests");
    context.subscriptions.push(controller);

    const funTestController = new FunTestController(controller, workspaceFolder);

    context.subscriptions.push(funTestController);
  } catch (error) {
    debug.appendLine(`Error initializing Fun Test Controller: ${error}`);
    vscode.window.showErrorMessage(
      "Failed to initialize Fun Test Explorer. You may need to update VS Code to version 1.59 or later.",
    );
  }
}
