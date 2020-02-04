import * as vscode from 'vscode';

export function getWordSeparatorConfig(): string {
    let editorConfig = vscode.workspace.getConfiguration('editor');
    return editorConfig['wordSeparators'];
}

export function isWordSeparator(c: String): boolean {
    return getWordSeparatorConfig().indexOf(c[0]) !== -1;
}