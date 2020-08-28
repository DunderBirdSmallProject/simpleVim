import * as vscode from 'vscode';
import { ActionArg } from './action';

export { deleteRange, replaceRange, copyRange, indentRange, reIndentRange };

// this file used for operation that takes one range argument
async function deleteRange(acArg: ActionArg): Promise<ActionArg> {
    await copyRange(acArg);
    await acArg.editor.edit((e) => {
        e.delete(acArg.range);
    });
    return acArg;
}
async function replaceRange(acArg: ActionArg): Promise<ActionArg> {
    await acArg.editor.edit((e) => {
        e.replace(acArg.range, acArg.arg);
    });
    return acArg;
}
async function copyRange(acArg: ActionArg): Promise<ActionArg> {
    let selectedString = acArg.editor.document.getText(acArg.range);
    if (acArg.range) {
        if (acArg.lineOp) {
            selectedString = '^$' + selectedString;
        }
        acArg.v.copyReg(selectedString);
    }
    //await vscode.env.clipboard.writeText(acArg.editor.document.getText(acArg.range));
    return acArg;
}
async function indentRange(acArg: ActionArg): Promise<ActionArg> {
    await vscode.commands.executeCommand('editor.action.indentLines');
    return acArg;
}
async function reIndentRange(acArg: ActionArg): Promise<ActionArg> {
    await vscode.commands.executeCommand('editor.action.outdentLines');
    return acArg;
}