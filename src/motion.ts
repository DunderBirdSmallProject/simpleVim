import * as vscode from 'vscode';
import { isWordSeparator } from './config';

// make sure that when all these functions below
// was called, the editor exists!
interface Motion {
    (pos: vscode.Position, ...arg: any[]): vscode.Position | undefined;
}

function currentLine(editor: vscode.TextEditor, pos: vscode.Position): vscode.TextLine {
    return editor.document.lineAt(pos.line);
}
function lineLength(editor: vscode.TextEditor, cnt: number): number {
    return editor.document.lineAt(cnt).text.length;
}
function currentLineLength(editor: vscode.TextEditor, pos: vscode.Position): number {
    return currentLine(editor, pos).text.length;
}

// note that the end of Line is not the position of the last character
// but the next of that.
function leftChar(pos: vscode.Position): vscode.Position {
    if(pos.character > 0) {
        return new vscode.Position(pos.line, pos.character-1);
    }
    else {
        return pos;
    }
}
function rightChar(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const maxCharacter = currentLineLength(editor, pos);
        if(pos.character < maxCharacter) {
            return new vscode.Position(pos.line, pos.character+1);
        }
    }
    return pos;
}
function upChar(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        if(pos.line > 0) {
            return new vscode.Position(pos.line-1, Math.min(pos.character, lineLength(editor, pos.line-1)));
        }
    }
    return pos;
}
function downChar(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        if(pos.line < editor.document.lineCount) {
            return new vscode.Position(pos.line+1, Math.min(pos.character, lineLength(editor, pos.line+1)));
        }
    }
    return pos;
}
function downCnt(pos: vscode.Position, cnt: number): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        let nextLineCnt : number;
        let nextCharacter: number;
        nextLineCnt = Math.min(editor.document.lineCount-1, pos.line+cnt);
        nextCharacter = Math.min(pos.character, lineLength(editor, nextLineCnt));
        return new vscode.Position(nextLineCnt, nextCharacter);
    }
    return pos;
}
function upCnt(pos: vscode.Position, cnt: number): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        let nextLineCnt : number;
        let nextCharacter: number;
        nextLineCnt = Math.max(0, pos.line-cnt);
        nextCharacter = Math.min(pos.character, lineLength(editor, nextLineCnt));
        return new vscode.Position(nextLineCnt, nextCharacter);
    }
    return pos;
}
function down20(pos: vscode.Position): vscode.Position {
    return downCnt(pos, 20);
}
function up20(pos: vscode.Position): vscode.Position {
    return upCnt(pos, 20);
}
function nextCharOnLine(pos: vscode.Position, c: string): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const text = currentLine(editor, pos).text;
        let index = text.indexOf(c, pos.character+1);
        if(index > pos.character) {
            return new vscode.Position(pos.line, index);
        } else {
            return new vscode.Position(pos.line, text.length-1);
        }
    }
    return pos;
}
function previousCharOnLine(pos: vscode.Position, c: string): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const text = currentLine(editor, pos).text;
        let pChar = pos.character - 1;
        while(pChar >= 0) {
            if(text[pChar] === c[0]) {
                return new vscode.Position(pos.line, pChar);
            }
            pChar--;
        }
        return new vscode.Position(pos.line, 0);
    }
    return pos;
}
function nextWordOnLine(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const text = currentLine(editor, pos).text;
        let pChar = pos.character + 1;
        while(pChar < text.length) {
            if(isWordSeparator(text[pChar])) {
                return new vscode.Position(pos.line, pChar);
            }
            pChar++;
        }
        return new vscode.Position(pos.line, text.length);
    }
    return pos;
}
function lastWordOnLine(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const text = currentLine(editor, pos).text;
        let pChar = pos.character - 2;
        while(pChar >= 0) {
            if(isWordSeparator(text[pChar])) {
                return new vscode.Position(pos.line, pChar+1);
            }
            pChar--;
        }
        return new vscode.Position(pos.line, 0);
    }
    return pos;
}
function startLine(pos: vscode.Position): vscode.Position {
    return new vscode.Position(pos.line, 0);
}
function startLineNonWhiteSpace(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        const fstNonWhiteidx = editor.document.lineAt(pos.line).firstNonWhitespaceCharacterIndex;
        return new vscode.Position(pos.line, fstNonWhiteidx);
    }
    return pos;
}
function endLine(pos: vscode.Position): vscode.Position {
    const editor = vscode.window.activeTextEditor;
    if(editor) {
        return new vscode.Position(pos.line, lineLength(editor, pos.line));
    }
    return pos;
}

// useful tools
function wholeLineWithSep(editor: vscode.TextEditor, pos: vscode.Position): vscode.Range {
    const line = editor.document.lineAt(pos.line);
    return line.rangeIncludingLineBreak;
}

export { leftChar, rightChar, upChar, downChar, downCnt, upCnt,
            nextCharOnLine, previousCharOnLine, nextWordOnLine, lastWordOnLine,
            startLine, startLineNonWhiteSpace, endLine, down20, up20 };
export { wholeLineWithSep };