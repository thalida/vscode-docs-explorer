import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import marked from 'marked';

export class TOCTreeProvider implements vscode.TreeDataProvider<TOCItem> {
  constructor(private workspaceRoot: string) {}

  getTreeItem(element: TOCItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TOCItem): Thenable<TOCItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No TOCItem in empty workspace');
      return Promise.resolve([]);
    }

    const children: TOCItem[] = [];
    const currPath = element ? element.path : this.workspaceRoot;
    for (const file of this.walkSync(currPath)) {
      const isMarkdown = file.endsWith('.md');
      if (!isMarkdown) {
        continue;
      }

      const relativePath = path.relative(currPath, file);
      const isFirstLevel = relativePath.split(path.sep).length === 1;
      if (!isFirstLevel) {
        const firstDir = relativePath.split(path.sep)[0];
        const firstDirPath = path.join(currPath, firstDir);
        const firstDirLabel = path.basename(firstDir);
        const foundMatchingChild = children.find(child => child.path === firstDirPath);
        if (!foundMatchingChild) {
          children.push(new TOCItem(firstDirPath, firstDirLabel, vscode.TreeItemCollapsibleState.Collapsed));
        }
        continue;
      }

      const label = path.basename(file);
      children.push(new TOCItem(file, label, vscode.TreeItemCollapsibleState.None));
    }

    return Promise.resolve(children);
  }

  private *walkSync(dir:string): Iterable<string> {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      if (file.isDirectory()) {
        yield* this.walkSync(path.join(dir, file.name));
      } else {
        yield path.join(dir, file.name);
      }
    }
  }
}

class TOCItem extends vscode.TreeItem {
  constructor(
    public readonly path: string,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.path = path;
    this.tooltip = `${this.label}`;
    this.description = this.label;

    const isDirectory = fs.lstatSync(this.path).isDirectory();
    this.iconPath = isDirectory ? new vscode.ThemeIcon('folder') : new vscode.ThemeIcon('markdown');
  }

  // iconPath = new vscode.ThemeIcon('file-text');

  command = {
    command: 'docs-explorer.openFile',
    title: 'Open File',
    arguments: [this]
  };
}


export class DocViewProvider implements vscode.WebviewViewProvider {
  webviewView: vscode.WebviewView | undefined;
  constructor(private treeItem: TOCItem | null) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = this.getWebviewContent();

  }

  update(treeItem: TOCItem) {
    this.treeItem = treeItem;
    if (this.webviewView) {
      this.webviewView.webview.html = this.getWebviewContent();
    }
  }

  getWebviewContent() {
    const fileContents = this.treeItem ? fs.readFileSync(this.treeItem.path, 'utf-8') : '';
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
