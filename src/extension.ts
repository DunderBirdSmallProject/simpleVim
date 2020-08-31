import * as vscode from 'vscode';
import { Vim, Mode } from './vim';

export function activate(context: vscode.ExtensionContext) {
    function registerCommand(commandId: string, run: (...args: any[]) => void): void {
        context.subscriptions.push(vscode.commands.registerCommand(commandId, run));
    }
    let sVim = new Vim();
    sVim.setMode(Mode.NORMAL);
    registerCommand('type', function (args) {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        sVim.getInput(args.text);
    });
    registerCommand('extension.svim_escape', function () {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        sVim.resumeNormal(vscode.window.activeTextEditor);
    });
    registerCommand('extension.svim_toggle', function () {
        if (!vscode.window.activeTextEditor) {
            return;
        }
        sVim.resumeNormal(vscode.window.activeTextEditor);
    });
}

export function deactivate() { }
