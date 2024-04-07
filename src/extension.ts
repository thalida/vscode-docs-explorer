// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MarkdownViewProvider } from './docs-explorer';

export function activate(context: vscode.ExtensionContext) {
	const rootPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: null;

	const activePath = vscode.window.activeTextEditor?.document.uri.fsPath || rootPath;

	const markdownViewProvider = new MarkdownViewProvider(
		rootPath,
		activePath
	);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(
		'docs-explorer.viewer',
		markdownViewProvider
	));

	vscode.window.onDidChangeActiveTextEditor((editor) => {
		const file = editor?.document.uri.fsPath;
		markdownViewProvider.update(file || null);
	});
}

export function deactivate() {}
