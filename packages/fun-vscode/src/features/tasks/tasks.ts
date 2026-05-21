import * as vscode from "vscode";
import { providePackageJsonTasks } from "./package.json";

interface FunTaskDefinition extends vscode.TaskDefinition {
  script: string;
}

export class FunTask extends vscode.Task {
  declare definition: FunTaskDefinition;

  constructor({
    script,
    name,
    detail,
    execution,
    scope = vscode.TaskScope.Workspace,
  }: {
    script: string;
    name: string;
    detail?: string;
    scope?: vscode.WorkspaceFolder | vscode.TaskScope.Global | vscode.TaskScope.Workspace;
    execution?: vscode.ProcessExecution | vscode.ShellExecution | vscode.CustomExecution;
  }) {
    super({ type: "fun", script }, scope, name, "fun", execution);
    this.detail = detail;
  }
}

/**
 * Registers the task provider for the fun extension.
 */
export function registerTaskProvider(context: vscode.ExtensionContext) {
  const taskProvider: vscode.TaskProvider<FunTask> = {
    provideTasks: async () => await providePackageJsonTasks(),
    resolveTask: task => resolveTask(task),
  };
  context.subscriptions.push(vscode.tasks.registerTaskProvider("fun", taskProvider));
}

/**
 * Parses tasks defined in the vscode tasks.json file.
 * For more information, see https://code.visualstudio.com/api/extension-guides/task-provider
 */
export function resolveTask(task: FunTask): FunTask | undefined {
  // Make sure the task has a script defined
  const definition: FunTask["definition"] = task.definition;
  if (!definition.script) return task;
  const shellCommand = definition.script.startsWith("fun ") ? definition.script : `fun ${definition.script}`;

  const newTask = new vscode.Task(
    definition,
    task.scope ?? vscode.TaskScope.Workspace,
    task.name,
    "fun",
    new vscode.ShellExecution(shellCommand),
  ) as FunTask;
  newTask.detail = `${shellCommand} - tasks.json`;
  return newTask;
}
