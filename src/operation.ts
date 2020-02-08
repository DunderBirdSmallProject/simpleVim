import * as vscode from 'vscode';

export { Operation, deleteRange, replaceRange, copyRange, indentRange, reIndentRange };

interface Operation {
    (editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void>;
}
async function deleteRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void> {
    await editor.edit((e) => {
        e.delete(range);
    });
}
async function replaceRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void> {
    await editor.edit((e) => {
        e.replace(range, text);
    });
}
async function copyRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void> {
    await vscode.env.clipboard.writeText(editor.document.getText(range));
}
async function indentRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void> {
    await vscode.commands.executeCommand('editor.action.indentLines');
}
async function reIndentRange(editor: vscode.TextEditor, range: vscode.Range, text: string): Promise<void> {
    await vscode.commands.executeCommand('editor.action.outdentLines');
}