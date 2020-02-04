import * as vscode from 'vscode';
import { isWordSeparator } from './config';

// make sure that when all these functions below
// was called, the editor exists!

function currentLine(editor: vscode.TextEditor): vscode.TextLine {
    const cursorPos = editor.selection.active;
    return editor.document.lineAt(cursorPos.line);
}
function lineLength(editor: vscode.TextEditor, cnt: number): number {
    return editor.document.lineAt(cnt).text.length;
}
function currentLineLength(editor: vscode.TextEditor): number {
    return currentLine(editor).text.length;
}

function currentPos(editor: vscode.TextEditor): vscode.Position {
    return editor.selection.active;
}
function currentLineBegin(editor: vscode.TextEditor): vscode.Position {
    return currentLine(editor).range.start;
}
function currentLineEnd(editor: vscode.TextEditor): vscode.Position {
    return currentLine(editor).range.end;
}

function leftChar(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    if(cursorPos.character > 0) {
        return new vscode.Position(cursorPos.line, cursorPos.character-1);
    }
    else {
        return cursorPos;
    }
}
function rightChar(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    const maxCharacter = currentLineLength(editor);
    if(cursorPos.character < maxCharacter) {
        return new vscode.Position(cursorPos.line, cursorPos.character+1);
    }
    else {
        return cursorPos;
    }
}
function upChar(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    if(line > 0) {
        const maxCharacter = lineLength(editor, line-1);
        return new vscode.Position(cursorPos.line-1, Math.min(maxCharacter, cursorPos.character));
    }
    else {
        return cursorPos;
    }
}
function downChar(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    if(line < editor.document.lineCount - 1) {
        const maxCharacter = lineLength(editor, line+1);
        return new vscode.Position(cursorPos.line+1, Math.min(maxCharacter, cursorPos.character));
    }
    else {
        return cursorPos;
    }
}
function downCnt(editor: vscode.TextEditor, cnt: number): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let nextLineCnt: number;
    if(line + cnt < editor.document.lineCount) {
        nextLineCnt = line + cnt;
    } else {
        nextLineCnt = editor.document.lineCount-1;
    }
    return new vscode.Position(nextLineCnt, Math.min(lineLength(editor, nextLineCnt), cursorPos.character));
}
function upCnt(editor: vscode.TextEditor, cnt: number): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let nextLineCnt: number;
    if(line - cnt >= 0) {
        nextLineCnt = line - cnt;
    } else {
        nextLineCnt = 0;
    }
    return new vscode.Position(nextLineCnt, Math.min(lineLength(editor, nextLineCnt), cursorPos.character));
}
function nextChar(editor: vscode.TextEditor, c: String): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let pChar = cursorPos.character + 1;
    const text = editor.document.lineAt(line).text;
    while(pChar < text.length) {
        if(text[pChar] === c[0]) {
            return new vscode.Position(line, pChar);
        }
        pChar++;
    }
    return new vscode.Position(line, text.length-1);
}
function preChar(editor: vscode.TextEditor, c: string): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let pChar = cursorPos.character - 1;
    const text = editor.document.lineAt(line).text;
    while(pChar >= 0) {
        if(text[pChar] === c[0]) {
            return new vscode.Position(line, pChar);
        }
        pChar--;
    }
    return new vscode.Position(line, 0);
}
function nextWord(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let pChar = cursorPos.character + 1;
    const text = editor.document.lineAt(line).text;
    while(pChar < text.length) {
        if(isWordSeparator(text[pChar])) {
            return new vscode.Position(line, pChar);
        }
        pChar++;
    }
    return new vscode.Position(line, text.length-1);
}
function lastWord(editor: vscode.TextEditor): vscode.Position {
    const cursorPos = editor.selection.active;
    const line = cursorPos.line;
    let pChar = cursorPos.character - 1;
    const text = editor.document.lineAt(line).text;
    while(pChar >= 0) {
        if(isWordSeparator(text[pChar])) {
            return new vscode.Position(line, pChar);
        }
        pChar--;
    }
    return new vscode.Position(line, 0);
}