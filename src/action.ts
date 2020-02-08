import * as vscode from 'vscode';
import { Mode, Vim } from './vim';
import { NormalResult } from './parser';
import * as motion from './motion';
import * as operation from './operation';

// TODO: use promise to refactor

interface Action {
    (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string): void;
}
interface CompileResult {
    repeat: number,
    operation: Action,
    range: vscode.Range,
    arg: string,
}

type Pos2Range = (pos: vscode.Position) => vscode.Range;
type PosArg2Range = (pos: vscode.Position, arg: string) => vscode.Range;
type Pos2Pos = (pos: vscode.Position) => vscode.Position;
type PosArg2Pos = (pos: vscode.Position, arg: string) => vscode.Position;
type Motion0Dict = {
    [c: string]: Pos2Range;
};
type Motion1Dict = {
    [c: string]: PosArg2Range;
};
type ActionDict = {
    [c: string]: Action;
};

function motionWrapper(f: Pos2Pos): Pos2Range {
    return pos => {
        return new vscode.Range(pos, f(pos));
    };
}
function motionArgWrapper(f: PosArg2Pos): PosArg2Range {
    return (pos, c) => {
        return new vscode.Range(pos, f(pos, c));
    };
}
export function isOperation(opStr: string): boolean {
    return opStr in operation0Dict || opStr in operation1Dict || opStr in operation2Dict;
}
export function isMotion(opStr: string): boolean {
    return opStr in motion0Dict || opStr in motion1Dict;
}
function setInsertMode(editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string): void {
    v.resumeNormal(editor);
    v.setMode(Mode.INSERT);
}
function setVisualModeNotLine(editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string): void {
    v.setMode(Mode.VISUAL);
}
function setVisualModeLine(editor: vscode.TextEditor, v: Vim, rage: vscode.Range, arg: string): void {
    v.setMode(Mode.VISUAL, true);
}
function moveCursorWrapper(motionFunc: Pos2Pos) {
    return (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string) => {
        const curPos = editor.selection.active;
        const nextPos = motionFunc(curPos);
        v.noticeMove(editor, nextPos);
        //editor.selection = new vscode.Selection(nextPos, nextPos);
        editor.revealRange(new vscode.Range(motion.startLine(nextPos), motion.endLine(nextPos)));
    };
}
function moveCursorArgWrapper(motionFunc: PosArg2Pos) {
    return (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string) => {
        const curPos = editor.selection.active;
        const nextPos = motionFunc(curPos, arg);
        v.noticeMove(editor, nextPos);
        //editor.selection = new vscode.Selection(nextPos, nextPos);
        editor.revealRange(new vscode.Range(motion.startLine(nextPos), motion.endLine(nextPos)));
    };
}
function opActionWrapper(acFunc: Action): Action {
    // to resume in the visual mode
    return (editor, v, range, arg) => {
        acFunc(editor, v, range, arg);
        v.resumeNormal(editor);
    };
}
function opRangeWrapper(opFunc: operation.Operation): Action {
    return (editor, v, range, arg) => {
        opFunc(editor, range, arg);
        v.resumeNormal(editor);
    };
}

export function compile(parseResult: NormalResult): CompileResult | undefined {
    if(vscode.window.activeTextEditor && isOperation(parseResult.operationStr)) {
        const isOperation1 = parseResult.operationStr in operation1Dict;
        const isOperation0 = parseResult.operationStr in operation0Dict;
        const curPos = vscode.window.activeTextEditor.selection.active;
        let f: Action;
        if(isOperation0) {
            f = operation0Dict[parseResult.operationStr];
        } else if(isOperation1) {
            f = operation1Dict[parseResult.operationStr];
        } else {
            f = operation2Dict[parseResult.operationStr];
        }

        let compileResult : CompileResult = {
            repeat: Number(parseResult.cntOperationStr), 
            operation: f,
            range: new vscode.Range(curPos, curPos),
            arg: parseResult.arg,
        };
        
        if(parseResult.motionStr !== "" && isOperation1) {
            if(parseResult.motionStr === parseResult.operationStr) {
                // replicate commands in operation1 means select the whole line
                compileResult.range = motion.wholeLineWithSep(vscode.window.activeTextEditor, curPos);
                return compileResult;
            }
            let getPos: (pos: vscode.Position) => vscode.Range;
            if(isMotion(parseResult.motionStr)) {
                if(parseResult.motionStr in motion0Dict) {
                    getPos = motion0Dict[parseResult.motionStr];
                }
                else {
                    getPos = (pos: vscode.Position) => {
                        return motion1Dict[parseResult.motionStr](pos, parseResult.arg);
                    };
                }
                let tmpRange = getPos(curPos);
                const initStart = tmpRange.start;
                for(let i = 1; i < Number(parseResult.cntMotionStr); i++) {
                    tmpRange = getPos(tmpRange.end);
                }
                compileResult.range = new vscode.Range(initStart, tmpRange.end);
                return compileResult;
            }
        } else {
            return compileResult;
        }
    }
}


export let operation0Dict: ActionDict = {
    "i": setInsertMode,
    "a": opActionWrapper((editor, v, range, arg) => {
        moveCursorWrapper(motion.rightChar)(editor, v, range, arg);
        setInsertMode(editor, v, range, arg);
    }),
    "v": setVisualModeNotLine,
    "V": setVisualModeLine,
    "o": opActionWrapper((editor, v, range, arg) => {
        editor.edit(e => {
            const curPos = editor.selection.active;
            const endPos = motion.endLine(curPos);
            e.insert(endPos, '\n');
        }).then(() => {
            moveCursorWrapper(motion.downChar)(editor, v, range, arg);
        });
        setInsertMode(editor, v, range, arg);
    }),
    "O": opActionWrapper((editor, v, range, arg) => {
        editor.edit(e => {
            const curPos = editor.selection.active;
            e.insert(motion.startLine(curPos), '\n');
        }).then(() => {
            moveCursorWrapper(motion.upChar)(editor, v, range, arg);
        });
        setInsertMode(editor, v, range, arg);
    }),
    "h": moveCursorWrapper(motion.leftChar),
    "j": moveCursorWrapper(motion.downChar),
    "k": moveCursorWrapper(motion.upChar),
    "l": moveCursorWrapper(motion.rightChar),
    "w": moveCursorWrapper(motion.nextWordOnLine),
    "b": moveCursorWrapper(motion.lastWordOnLine),
    "s": moveCursorWrapper(motion.startLine),
    "e": moveCursorWrapper(motion.endLine),
    "0": moveCursorWrapper(motion.startLine),
    "D": moveCursorWrapper(motion.down20),
    "U": moveCursorWrapper(motion.up20),
    "x": (editor, v, range, arg) => {
        editor.edit(e => {
            const curPos = editor.selection.active;
            e.delete(new vscode.Range(curPos, motion.rightChar(curPos)));
        });
    },
};
export let operation1Dict: ActionDict = {
    "d": opRangeWrapper(operation.deleteRange),
    "y": opRangeWrapper(operation.copyRange),
};
export let operation2Dict: ActionDict = {
    "f": moveCursorArgWrapper(motion.nextCharOnLine),
    "F": moveCursorArgWrapper(motion.previousCharOnLine),
    "r": (editor, v, range, arg) => {
        editor.edit(e => {
            const curPos = editor.selection.active;
            e.replace(new vscode.Range(curPos, motion.rightChar(curPos)), arg);
        });
    }
};

export let motion0Dict: Motion0Dict = {
    "w": motionWrapper(motion.nextWordOnLine),
    "b": motionWrapper(motion.lastWordOnLine),
    "h": motionWrapper(motion.leftChar),
    "j": motionWrapper(motion.downChar),
    "k": motionWrapper(motion.upChar),
    "l": motionWrapper(motion.rightChar),
    "e": motionWrapper(motion.endLine),
    "s": motionWrapper(motion.startLine),
    "D": motionWrapper(motion.down20),
    "U": motionWrapper(motion.up20),
};

export let motion1Dict: Motion1Dict = {
    "f": motionArgWrapper(motion.nextCharOnLine),
    "i": (pos, c) => {
        const prePos = motion.previousCharOnLine(pos, c);
        const nextPos = motion.nextCharOnLine(pos, c);
        return new vscode.Range(prePos, nextPos);
    }
};