import * as vscode from 'vscode';
import { Mode, Vim } from './vim';
import { NormalResult } from './parser';
import * as motion from './motion';
import * as operation from './operation';

interface ActionArg {
    editor: vscode.TextEditor,
    v: Vim,
    range: vscode.Range,
    arg: string
}
interface Action {
    (acArg: ActionArg): Thenable<ActionArg>;
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
function opActionWrapper(acFunc: Action): Action {
    // to resume in the visual mode
    return async (acArg) => {
        await acFunc(acArg);
        acArg.v.resumeNormal(acArg.editor);
        return acArg;
    };
}
function opRangeWrapper(opFunc: operation.Operation): Action {
    return async (acArg) => {
        await opFunc(acArg.editor, acArg.range, acArg.arg);
        return acArg;
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

export async function runAction(parseResult: NormalResult, editor: vscode.TextEditor, v: Vim) {
    let compileResult = compile(parseResult);
    if(compileResult) {
        const repeat = compileResult.repeat;
        for(let i = 0; i < repeat; i++) {
            if(!compileResult) {
                break;
            }
            await compileResult.operation({
                editor: editor,
                v: v,
                range: compileResult.range,
                arg: compileResult.arg
            });
            compileResult = compile(parseResult);
        }
    }
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
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            const endPos = motion.endLine(curPos);
            e.insert(endPos, '\n');
        }).then(() => {
            moveCursorWrapper(motion.downChar)(acArg);
        });
        await setInsertMode(acArg);
        return acArg;
    }),
    "O": opActionWrapper(async (acArg: ActionArg) => {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            e.insert(motion.startLine(curPos), '\n');
        }).then(() => {
            moveCursorWrapper(motion.upChar)(acArg);
        });
        setInsertMode(acArg);
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