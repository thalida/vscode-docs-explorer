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
		context,
		rootPath,
		activePath
	);

	context.subscriptions.push(vscode.window.registerWebviewViewProvider(
		'docs-explorer.viewer',
		markdownViewProvider
	));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
		const file = editor?.document.uri.fsPath;
		markdownViewProvider.update(file || null);
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
		const file = event.document.uri.fsPath;
		const isMarkdown = file.endsWith('.md');
		if (!isMarkdown) {
			return;
		}
		markdownViewProvider.update(file);
	}));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
		const file = document.uri.fsPath;
		const isMarkdown = file.endsWith('.md');
		if (!isMarkdown) {
			return;
		}
		markdownViewProvider.update(file);
	}));

	context.subscriptions.push(vscode.workspace.onDidCreateFiles((event) => {
		const file = event.files[0].fsPath;
		const isMarkdown = file.endsWith('.md');
		if (!isMarkdown) {
			return;
		}
		markdownViewProvider.update(file);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.pinDocument', () => {
		markdownViewProvider.pinDocument();
	}));

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.unpinDocument', () => {
		markdownViewProvider.unpinDocument();
	}));
}

export function deactivate() {}
