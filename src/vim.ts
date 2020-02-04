import * as vscode from 'vscode';

enum Mode {
    NORMAL,
    INSERT,
    VISUAL
};

class Vim
{
    private mode: Mode;
    private buffer: String;
    
    constructor() {
        this.mode = Mode.NORMAL;
        this.buffer = "";
    }

    public setState(newmode: Mode): void {
        if(vscode.window.activeTextEditor) {
            if(newmode === Mode.NORMAL) {
                vscode.window.activeTextEditor.options = {
                    cursorStyle: vscode.TextEditorCursorStyle.Block
                };
            }
            else {
                vscode.window.activeTextEditor.options = {
                    cursorStyle: vscode.TextEditorCursorStyle.Line
                };
            }
            this.mode = newmode;
        }
    }
};