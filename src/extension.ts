// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { MarkdownViewProvider } from './docs-explorer';

export function activate(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'docs-explorer.context.isPinned', false);
	vscode.commands.executeCommand('setContext', 'docs-explorer.context.shouldAutoScroll', false);

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

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.pin', () => {
		markdownViewProvider.setIsPinned(true);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.unpin', () => {
		markdownViewProvider.setIsPinned(false);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.enableAutoScroll', () => {
		markdownViewProvider.setShouldAutoScroll(true);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('docs-explorer.viewer.disableAutoScroll', () => {
		markdownViewProvider.setShouldAutoScroll(false);
	}));
}

export function deactivate() {}
