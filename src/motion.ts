import * as vscode from 'vscode';
import { posix } from 'path';
import { appendFileSync } from 'fs';

// make sure that when all these functions below
// was called, the editor exists!

interface Motion {
    (editor: vscode.TextEditor): vscode.Position;
};

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