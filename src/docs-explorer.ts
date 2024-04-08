import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';


export class MarkdownViewProvider implements vscode.WebviewViewProvider {
  private extensionContext: vscode.ExtensionContext | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private workspacePath: string | null = null;
  private filepath: string | null = null;
  private isPinned: boolean = false;
  private pinnedFile: string | null = null;
  private shouldAutoScroll: boolean = true;

  constructor(context: vscode.ExtensionContext, workspacePath: string | null, filepath: string | null) {
    this.extensionContext = context;
    this.workspacePath = workspacePath;
    this.filepath = filepath;

    vscode.commands.executeCommand('setContext', 'docs-explorer.context.isPinned', this.isPinned);
    vscode.commands.executeCommand('setContext', 'docs-explorer.context.shouldAutoScroll', this.shouldAutoScroll);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true
    };
    this.webviewView = webviewView;
    this.renderWebviewView();
  }

  async renderWebviewView() {
    if (!this.webviewView) {
      return;
    }
    this.webviewView.webview.html = await this.getWebviewContent();
  }

  update(filepath: string | null) {
    this.filepath = filepath;
    this.renderWebviewView();
  }

  setIsPinned(state: boolean) {
    if (!this.webviewView) {
      return;
    }

    this.isPinned = state;
    this.pinnedFile = this.isPinned ? this.filepath : null;
    vscode.commands.executeCommand('setContext', 'docs-explorer.context.isPinned', this.isPinned);
    this.renderWebviewView();
  }

  setShouldAutoScroll(state: boolean) {
    this.shouldAutoScroll = state;
    vscode.commands.executeCommand('setContext', 'docs-explorer.context.shouldAutoScroll', this.shouldAutoScroll);
    this.renderWebviewView();
  }

  private findMarkdownFile(filepath: string | null): string | null {
    if (!filepath) {
      return null;
    }

    const isMarkdown = filepath.endsWith('.md');
    if (isMarkdown) {
      return filepath;
    }

    const isDirectory = fs.lstatSync(filepath).isDirectory();
    if (isDirectory) {
			const markdownFile = this.findNearestMarkdownFile(filepath);
      if (markdownFile) {
        return markdownFile;
      }
    }

    const parentDirs = filepath?.split('/').slice(0, -1);
		if (!parentDirs) {
      return null;
		}

		for (let i = parentDirs.length; i >= 0; i-=1) {
      const dirPath = parentDirs.slice(0, i).join('/');
			const markdownFile = this.findNearestMarkdownFile(dirPath);
      if (markdownFile) {
        return markdownFile;
      }

      if (dirPath === this.workspacePath) {
        break;
      }
		}

    return null;
  }

  private findNearestMarkdownFile(dirPath: string): string | null {
    let foundMarkdownFile: string | null | undefined = null;
    const files = fs.readdirSync(dirPath);
    const readmeFile = files.find((file) => file.toLowerCase() === 'readme.md');

    if (readmeFile) {
      foundMarkdownFile = readmeFile;
    } else {
      foundMarkdownFile = files.find((file) => file.endsWith('.md'));
    }

    if (foundMarkdownFile) {
      return path.join(dirPath, foundMarkdownFile);
    }

    return null;
  }

  private getRelativePath(filepath: string): string {
    if (!this.workspacePath) {
      return '';
    }

    return path.relative(this.workspacePath, filepath);
  }

  async getWebviewContent() {
    if (!this.extensionContext || !this.webviewView) {
      return '';
    }

    const currFile = this.isPinned ? this.pinnedFile : this.filepath;
    const markdownFile = this.findMarkdownFile(currFile);

    const templatePath = vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'templates', 'doc-viewer.html');
    const templateStr = fs.readFileSync(templatePath.fsPath, 'utf-8');

    const markdownFileData = markdownFile ? fs.readFileSync(markdownFile, 'utf-8') : '';
    const currFileRelativePath = currFile ? this.getRelativePath(currFile) : '';

    const compiledTemplate = templateStr
    .replace("\"${fileData}\"", JSON.stringify(markdownFileData))
    .replace("\"${activeFile}\"", JSON.stringify(currFileRelativePath))
    .replace("\"${isPinned}\"", JSON.stringify(this.isPinned))
    .replace("\"${shouldAutoScroll}\"", JSON.stringify(this.shouldAutoScroll));

    const mdRelativePath = markdownFile ? this.getRelativePath(markdownFile) : '';
    this.webviewView.title = markdownFile ? `Document Viewer - ${mdRelativePath}` : 'Document Viewer';

    return compiledTemplate;
  }
}
