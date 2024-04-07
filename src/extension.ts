// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

import { TOCTreeProvider, DocViewProvider } from './docs-explorer';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: "";
	const docViewProvider = new DocViewProvider(null);

	context.subscriptions.push(vscode.window.registerTreeDataProvider(
		'docs-explorer.toc',
		new TOCTreeProvider(rootPath)
	));

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(
		'docs-explorer.viewer',
		docViewProvider
	));

  context.subscriptions.push(
    vscode.commands.registerCommand('docs-explorer.openFile', (file) => {
			const isDirectory = fs.lstatSync(file.path).isDirectory();
			if (isDirectory) {
				return;
			}

			docViewProvider.update(file);
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
