import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { json } from 'stream/consumers';


export class MarkdownViewProvider implements vscode.WebviewViewProvider {
  private extensionContext: vscode.ExtensionContext | undefined;
  private webviewView: vscode.WebviewView | undefined;
  private workspacePath: string | null = null;
  private filepath: string | null = null;
  private nearestMarkdownFile: string | null = null;

  constructor(context: vscode.ExtensionContext, workspacePath: string | null, filepath: string | null) {
    this.extensionContext = context;
    this.workspacePath = workspacePath;
    this.filepath = filepath;
    this.nearestMarkdownFile = this.findNearestMarkdownFile(this.filepath);
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
    this.nearestMarkdownFile = this.findNearestMarkdownFile(this.filepath);
    this.renderWebviewView();
  }

  private findNearestMarkdownFile(filepath: string | null): string | null {
    if (!filepath) {
      return null;
    }

    const isMarkdown = filepath.endsWith('.md');
    if (isMarkdown) {
      return filepath;
    }

    const isDirectory = fs.lstatSync(filepath).isDirectory();
    if (isDirectory) {
			const markdownFile = this.findNearestMarkdownFileInDirectory(filepath);
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
			const markdownFile = this.findNearestMarkdownFileInDirectory(dirPath);
      if (markdownFile) {
        return markdownFile;
      }

      if (dirPath === this.workspacePath) {
        break;
      }
		}

    return null;
  }

  private findNearestMarkdownFileInDirectory(dirPath: string): string | null {
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

  async getWebviewContent() {
    if (!this.extensionContext) {
      return '';
    }

    const markdownFileData = this.nearestMarkdownFile ? fs.readFileSync(this.nearestMarkdownFile, 'utf-8') : '';
    const template = vscode.Uri.joinPath(this.extensionContext.extensionUri, 'src', 'templates', 'doc-viewer.html');
    const templateStr = fs.readFileSync(template.fsPath, 'utf-8');
    const compiledTemplate = templateStr.replace("\"${fileData}\"", JSON.stringify(markdownFileData));
    return compiledTemplate;
  }

}
