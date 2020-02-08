import * as vscode from 'vscode';
import { NormalParser, InsertParser, VisualParser } from './parser';
import { runAction } from './interpret';
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
        vscode.window.onDidChangeActiveTextEditor((textEditor) => {
            if(!textEditor) {
                return;
            }
            this.setMode(Mode.NORMAL);
        });
    }
    public resumeNormal(editor: vscode.TextEditor) {
        switch(this.mode) {
            case Mode.VISUAL: {
                const curPos = editor.selection.active;
                editor.selection = new vscode.Selection(curPos, curPos);
                this.setMode(Mode.NORMAL);
                break;
            }
            default: {
                break;
            }
        }
    }
    public noticeMove(editor: vscode.TextEditor, pos: vscode.Position) {
        switch(this.mode) {
            case Mode.INSERT:
            case Mode.NORMAL: {
                editor.selection = new vscode.Selection(pos, pos);
                break;
            }
            case Mode.VISUAL: {
                if(this.v_pos) {
                    if(this.v_line) {
                        const currentLine = editor.document.lineAt(pos);
                        let nextEnd : vscode.Position;
                        if(pos.line < this.v_pos.line) {
                            this.v_pos = editor.document.lineAt(this.v_pos.line).range.end;
                            nextEnd = currentLine.range.start;
                        } else {
                            this.v_pos = editor.document.lineAt(this.v_pos.line).range.start;
                            nextEnd = currentLine.range.end;
                        }
                        editor.selection = new vscode.Selection(this.v_pos, nextEnd);
                    } else {
                        editor.selection = new vscode.Selection(this.v_pos, pos);
                    }
                }
                break;
            }
            default: {
                break;
            }
        }
    }
    public getInput(input: string): void {
        const editor = vscode.window.activeTextEditor;
        if(editor) {
            switch(this.mode) {
                case Mode.NORMAL: {
                    let result = this.normalParser.parse(input);
                    if(result) {
                        runAction(result, editor, this);
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
                        runAction(result, editor, this);
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
                if(this.mode === Mode.VISUAL) {
                    editor.selection = new vscode.Selection(editor.selection.anchor, editor.selection.anchor);
                }
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
    public getMode(): Mode {
        return this.mode;
    }
};