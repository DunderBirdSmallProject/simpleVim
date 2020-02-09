import * as vscode from 'vscode';
import { ActionArg } from './action';

export { Operation, deleteRange, replaceRange, copyRange, indentRange, reIndentRange };

// this file used for operation that takes one range argument
interface Operation {
    (acArg: ActionArg): Promise<void>;
}
async function deleteRange(acArg: ActionArg): Promise<void> {
    await copyRange(acArg);
    await acArg.editor.edit((e) => {
        e.delete(acArg.range);
    });
}
async function replaceRange(acArg: ActionArg): Promise<void> {
    await acArg.editor.edit((e) => {
        e.replace(acArg.range, acArg.arg);
    });
}
async function copyRange(acArg: ActionArg): Promise<void> {
    let selectedString = acArg.editor.document.getText(acArg.range);
    if(acArg.range) {
        if(acArg.lineOp) {
            selectedString = '^$' + selectedString;
        }
        acArg.v.copyReg(selectedString);
    }
    //await vscode.env.clipboard.writeText(acArg.editor.document.getText(acArg.range));
}
async function indentRange(acArg: ActionArg): Promise<void> {
    await vscode.commands.executeCommand('editor.action.indentLines');
}
async function reIndentRange(acArg: ActionArg): Promise<void> {
    await vscode.commands.executeCommand('editor.action.outdentLines');
}