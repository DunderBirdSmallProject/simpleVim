import * as vscode from 'vscode';
import { NormalParser, InsertParser } from './parser';
import { compile } from './action';
import { getSvimEsc } from './config';

export enum Mode {
    NORMAL,
    INSERT,
    VISUAL
};

export class Vim
{
    private mode: Mode;
    private normalParser: NormalParser;
    private insertParser: InsertParser;

    private v_line: boolean;
    
    constructor() {
        this.normalParser = new NormalParser();
        this.insertParser = new InsertParser();
        this.mode = Mode.NORMAL;
    }

    public getInput(input: string): void {
        const editor = vscode.window.activeTextEditor;
        if(editor) {
            switch(this.mode) {
                case Mode.NORMAL: {
                    const result = this.normalParser.parse(input);
                    if(result) {
                        vscode.window.showInformationMessage('arg: ' + result.operationStr + ' motion: ' + result.motionStr);
                        const compileResult = compile(result);
                        if(compileResult) {
                            for(let i = 0; i < compileResult.repeat; i++) {
                                if(this.mode !== Mode.NORMAL) {
                                    break;
                                }
                                compileResult.operation(editor, this,
                                                        compileResult.range, compileResult.arg);
                            }
                        }
                    }
                    break;
                }
                case Mode.INSERT: {
                    if(this.insertParser.parse(input)) {
                        this.setMode(Mode.NORMAL);
                        editor.edit(e => {
                            const curPos = editor.selection.active;
                            // the last character of SvimEsc wasn't printed
                            const startPos = new vscode.Position(curPos.line, curPos.character-getSvimEsc().length+1);
                            e.delete(new vscode.Range(startPos, curPos));
                        });
                    } else {
                        vscode.commands.executeCommand('default:type', {
                            text: input
                        });
                    }
                    break;
                }
                default: {
                    
                }
            }
        }
    }
    public resetParser(): void {
        this.insertParser.reset();
        this.normalParser.reset();
    }
    public setMode(newmode: Mode, arg: boolean=false): void {
        if(vscode.window.activeTextEditor && newmode !== this.mode) {
            if(newmode === Mode.NORMAL) {
                vscode.window.activeTextEditor.options = {
                    cursorStyle: vscode.TextEditorCursorStyle.Block
                };
            } else if(newmode === Mode.INSERT) {
                vscode.window.activeTextEditor.options = {
                    cursorStyle: vscode.TextEditorCursorStyle.Line
                };
            } else if(newmode === Mode.VISUAL) {
                this.v_line = arg;
            }
            this.mode = newmode;
            this.resetParser();
        }
    }
};