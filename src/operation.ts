import * as vscode from 'vscode';

export { Operation, deleteRange, replaceRange };

interface Operation {
    (editor: vscode.TextEditor, range: vscode.Range, text: string): void;
}
function deleteRange(editor: vscode.TextEditor, range: vscode.Range, text: string): void {
    editor.edit((e) => {
        e.delete(range);
    });
}
function replaceRange(editor: vscode.TextEditor, range: vscode.Range, text: string): void {
    editor.edit((e) => {
        e.replace(range, text);
    });
}