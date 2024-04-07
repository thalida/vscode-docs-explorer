import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import marked from 'marked';

export class MarkdownViewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | undefined;
  private workspacePath: string | null = null;
  private filepath: string | null = null;
  private nearestMarkdownFile: string | null = null;

  constructor(workspacePath: string | null, filepath: string | null) {
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

  renderWebviewView() {
    if (!this.webviewView) {
      return;
    }
    this.webviewView.webview.html = this.getWebviewContent();
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
    const readmeFile = files.find((file) => file === 'README.md');

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

  getWebviewContent() {
    const fileContents = this.nearestMarkdownFile ? fs.readFileSync(this.nearestMarkdownFile, 'utf-8') : '';
    const markdown = marked.parse(fileContents);
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <main>
        ${markdown}
      </main>
    </body>
    </html>`;
  }

}
