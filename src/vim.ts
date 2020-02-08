import * as vscode from 'vscode';
import { NormalParser, InsertParser, VisualParser } from './parser';
import { compile, operation0Dict, operation1Dict, isOperation, isMotion } from './action';
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
    private visualParser: VisualParser;

    private v_line: boolean;
    private v_pos: vscode.Position | undefined;
    
    constructor() {
        this.normalParser = new NormalParser();
        this.insertParser = new InsertParser();
        this.visualParser = new VisualParser();
        this.mode = Mode.NORMAL;
        this.v_line = false;
    }

    public getInput(input: string): void {
        const editor = vscode.window.activeTextEditor;
        if(editor) {
            switch(this.mode) {
                case Mode.NORMAL: {
                    const result = this.normalParser.parse(input);
                    if(result) {
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
                case Mode.VISUAL: {
                    const result = this.visualParser.parse(input);
                    if(result) {
                        let compileResult = compile(result);
                        if(compileResult) {
                            if(result.operationStr in operation1Dict) {
                                compileResult.range = new vscode.Range(editor.selection.start, editor.selection.end);
                            }
                            compileResult.operation(editor, this,
                                                    compileResult.range, compileResult.arg);
                            if(isOperation(result.operationStr) && !isMotion(result.operationStr)) {
                                this.setMode(Mode.NORMAL);
                                editor.selection = new vscode.Selection(editor.selection.start, editor.selection.start);
                            } else {
                                if(!this.v_pos) {
                                    if(this.v_line) {
                                        this.v_pos = new vscode.Position(editor.selection.active.line, 0);
                                    } else {
                                        this.v_pos = editor.selection.active;
                                    }
                                }
                               
                                // vscode.Selection will guarantee that start is before or equal to end
                                if(this.v_line) {
                                    const currentLine = editor.document.lineAt(editor.selection.active);
                                    let nextEnd : vscode.Position;
                                    if(editor.selection.active.line < this.v_pos.line) {
                                        this.v_pos = editor.document.lineAt(this.v_pos.line).range.end;
                                        nextEnd = currentLine.range.start;
                                    } else {
                                        this.v_pos = editor.document.lineAt(this.v_pos.line).range.start;
                                        nextEnd = currentLine.range.end;
                                    }
                                    editor.selection = new vscode.Selection(this.v_pos, nextEnd);
                                } else {
                                    editor.selection = new vscode.Selection(this.v_pos, editor.selection.active);
                                }
                            }
                        }
                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }
    }
    public resetParser(): void {
        this.insertParser.reset();
        this.normalParser.reset();
        this.visualParser.reset();
    }
    public setMode(newmode: Mode, arg: boolean=false): void {
        this.v_pos = undefined;
        this.v_line = false;
        if(vscode.window.activeTextEditor) {
            const editor = vscode.window.activeTextEditor;
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
                if(this.v_line) {
                    const currentLine = editor.document.lineAt(editor.selection.active.line);
                    this.v_pos = currentLine.range.start;
                    editor.selection = new vscode.Selection(currentLine.range.start, currentLine.range.end);
                } else {
                    this.v_pos = vscode.window.activeTextEditor.selection.active;
                }
            }
            this.mode = newmode;
            this.resetParser();
        }
    }
};