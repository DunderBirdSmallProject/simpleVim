import * as vscode from 'vscode';
import { Mode, Vim } from './vim';
import * as motion from './motion';
import * as operation from './operation';
import { runAction } from './interpret';

export interface ActionArg {
    editor: vscode.TextEditor,
    v: Vim,
    range: vscode.Range,
    arg: string,
    lineOp?: boolean
}
export interface Action {
    (acArg: ActionArg): Thenable<ActionArg>;
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
async function setInsertMode(acArg: ActionArg): Promise<ActionArg> {
    acArg.v.resumeNormal(acArg.editor);
    acArg.v.setMode(Mode.INSERT);
    return acArg;
}
async function setVisualModeNotLine(acArg: ActionArg): Promise<ActionArg> {
    acArg.v.setMode(Mode.VISUAL);
    return acArg;
}
async function setVisualModeLine(acArg: ActionArg): Promise<ActionArg> {
    acArg.v.setMode(Mode.VISUAL, true);
    return acArg;
}
/**
 * enter a new line above or below and move the cursor to the end of that line
 * @param acArg Action arguments
 * @param direct true: down false: up
 * @return Promise<ActionArg>
 */
async function enterNewLine(acArg: ActionArg, direct: boolean): Promise<ActionArg> {
    let nextLineEnd : vscode.Position;
    const curLine = acArg.editor.selection.active.line;
    if(direct) {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            const endPos = motion.endLine(curPos);
            e.insert(endPos, '\n');
        });
        nextLineEnd = acArg.editor.document.lineAt(curLine+1).range.end;
    } else {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            e.insert(motion.startLine(curPos), '\n');
        });
        nextLineEnd = acArg.editor.document.lineAt(curLine).range.end;
    }
    // move the cursor
    acArg.v.noticeMove(acArg.editor, nextLineEnd);
    acArg.editor.revealRange(new vscode.Range(motion.startLine(nextLineEnd), motion.endLine(nextLineEnd)));
    return acArg;
}
function moveCursorWrapper(motionFunc: Pos2Pos) {
    return async (acArg: ActionArg) => {
        const curPos = acArg.editor.selection.active;
        const nextPos = motionFunc(curPos);
        acArg.v.noticeMove(acArg.editor, nextPos);
        //editor.selection = new vscode.Selection(nextPos, nextPos);
        acArg.editor.revealRange(new vscode.Range(motion.startLine(nextPos), motion.endLine(nextPos)));
        return acArg;
    };
}
function moveCursorArgWrapper(motionFunc: PosArg2Pos) {
    return async (acArg: ActionArg) => {
        const curPos = acArg.editor.selection.active;
        const nextPos = motionFunc(curPos, acArg.arg);
        acArg.v.noticeMove(acArg.editor, nextPos);
        //editor.selection = new vscode.Selection(nextPos, nextPos);
        acArg.editor.revealRange(new vscode.Range(motion.startLine(nextPos), motion.endLine(nextPos)));
        return acArg;
    };
}
/**
 * switch to normal mode when vim is in visual mode
 * @param acFunc Action argument
 */
function opActionWrapper(acFunc: Action): Action {
    return async (acArg) => {
        await acFunc(acArg);
        acArg.v.resumeNormal(acArg.editor);
        return acArg;
    };
}
function opRangeWrapper(opFunc: operation.Operation): Action {
    return async (acArg) => {
        await opFunc(acArg);
        return acArg;
    };
}

export let operation0Dict: ActionDict = {
    "i": setInsertMode,
    "a": opActionWrapper(async (acArg: ActionArg) => {
        await moveCursorWrapper(motion.rightChar)(acArg);
        await setInsertMode(acArg);
        return acArg;
    }),
    "v": setVisualModeNotLine,
    "V": setVisualModeLine,
    "o": opActionWrapper(async (acArg: ActionArg) => {
        await enterNewLine(acArg, true);
        await setInsertMode(acArg);
        return acArg;
    }),
    "O": opActionWrapper(async (acArg: ActionArg) => {
        await enterNewLine(acArg, false);
        await setInsertMode(acArg);
        return acArg;
    }),
    "u": opActionWrapper(async (acArg: ActionArg) => {
        await vscode.commands.executeCommand('undo');
        return acArg;
    }),
    "p": opActionWrapper(async (acArg: ActionArg) => {
        let toInsert = acArg.v.getReg();
        if(toInsert && toInsert !== '^$') {
            if(toInsert.indexOf('^$') === 0) {
                toInsert = toInsert.slice(2);
                await enterNewLine(acArg, true);
            }
            await acArg.editor.edit((e) => {
                e.insert(acArg.editor.selection.active, <string>toInsert);
            });
        }
        return acArg;
    }),
    "P": opActionWrapper(async (acArg: ActionArg) => {
        let toInsert = acArg.v.getReg();
        if(toInsert && toInsert !== '^$') {
            if(toInsert.indexOf('^$') === 0) {
                toInsert = toInsert.slice(2);
                await enterNewLine(acArg, false);
            }
            await acArg.editor.edit((e) => {
                e.insert(acArg.editor.selection.active, <string>toInsert);
            });
        }
        return acArg;
    }),
    "h": moveCursorWrapper(motion.leftChar),
    "j": moveCursorWrapper(motion.downChar),
    "k": moveCursorWrapper(motion.upChar),
    "l": moveCursorWrapper(motion.rightChar),
    "w": moveCursorWrapper(motion.nextWordOnLine),
    "b": moveCursorWrapper(motion.lastWordOnLine),
    "s": moveCursorWrapper(motion.startLine),
    "e": moveCursorWrapper(motion.endLine),
    "D": moveCursorWrapper(motion.down20),
    "U": moveCursorWrapper(motion.up20),
    "x": async (acArg: ActionArg) => {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            e.delete(new vscode.Range(curPos, motion.rightChar(curPos)));
        });
        return acArg;
    },
};
export let operation1Dict: ActionDict = {
    "d": opActionWrapper(opRangeWrapper(operation.deleteRange)),
    "y": opActionWrapper(opRangeWrapper(operation.copyRange)),
    ">": opRangeWrapper(operation.indentRange),
    "<": opRangeWrapper(operation.reIndentRange)
};
export let operation2Dict: ActionDict = {
    "f": moveCursorArgWrapper(motion.nextCharOnLine),
    "F": moveCursorArgWrapper(motion.previousCharOnLine),
    "r": async (acArg: ActionArg) => {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            e.replace(new vscode.Range(curPos, motion.rightChar(curPos)), acArg.arg);
        });
        return acArg;
    },
    "z": async (acArg: ActionArg) => {
        let lineNumber = acArg.editor.selection.active.line;
        let at: string;
        switch(acArg.arg) {
            case 'z': {
                at = 'center';
                break;
            }
            case 't': {
                at = 'top';
                break;
            }
            case 'b': {
                at = 'bottom';
                break;
            }
            default: {
                return acArg;
            }
        }
        await vscode.commands.executeCommand('revealLine', {
            lineNumber: lineNumber,
            at: at
        });
        return acArg;
    }
};
export let virtualDict: ActionDict = {
    ".": async (acArg: ActionArg) => {
        let parseResult = acArg.v.getLastCmd();
        if(parseResult) {
            await runAction(parseResult, acArg.editor, acArg.v);
        }
        return acArg;
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