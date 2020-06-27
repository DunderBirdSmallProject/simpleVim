import * as vscode from 'vscode';
import { Mode, Vim } from './vim';
import * as motion from './motion';
import * as operation from './operation';
import { runAction } from './interpret';
import * as tool from './tool';

export interface ActionArg {
    editor: vscode.TextEditor,
    v: Vim,
    range: vscode.Range,
    arg: string,
    lineOp?: boolean,
    strCmdArg?: string[]
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
/**
 * return a range: (currentPosition, f(currentPosition) )
 * @param f a function that returns a position based on current position
 */
function motionWrapper(f: Pos2Pos): Pos2Range {
    return pos => {
        return new vscode.Range(pos, f(pos));
    };
}
/**
 * return a range: (currentPosition, f(currentPosition) )
 * @param f a function that and returns a position based on current position and a given character
 */
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
 * @param indent whether auto indent
 * @return Promise<ActionArg>
 */
async function enterNewLine(acArg: ActionArg, direct: boolean, indent: boolean = false): Promise<ActionArg> {
    if (direct) {
        await vscode.commands.executeCommand('editor.action.insertLineAfter');
    } else {
        await vscode.commands.executeCommand('editor.action.insertLineBefore');
    }
    if(!indent) {
        const line = acArg.editor.selection.active.line;
        const character = acArg.editor.selection.active.character;
        const beginOfLine = new vscode.Position(line, 0);
        const curPos = new vscode.Position(line, character);
        await acArg.editor.edit(e => {
            e.delete(new vscode.Range(beginOfLine, curPos));
        });
        acArg.editor.selection = new vscode.Selection(beginOfLine, beginOfLine);
    }
    return acArg;
}
/**
 * return an Action that will change the cursor's position
 * @param motionFunc a motion func that returns a new position
 */
function moveCursorWrapper(motionFunc: Pos2Pos) {
    return async (acArg: ActionArg) => {
        const curPos = acArg.editor.selection.active;
        const nextPos = motionFunc(curPos);
        acArg.v.noticeMove(acArg.editor, nextPos);
        //editor.selection = new vscode.Selection(nextPos, nextPos);
        // acArg.editor.revealRange(new vscode.Range(motion.startLine(nextPos), motion.endLine(nextPos)));
        acArg.editor.revealRange(new vscode.Range(nextPos, nextPos));
        return acArg;
    };
}
/**
 * return an Action that will change the cursor's position
 * @param motionFunc a motion func that returns a new position
 */
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

/**
 * change string to commands
 * @param cmds string array that represents a series of commands
 */
function strActionWrapper(cmds: string[]): Action {
    return async (acArg: ActionArg) => {
        try {
            for(let str of cmds) {
                await vscode.commands.executeCommand(str);
            }
        }
        catch(error) {
            vscode.window.showErrorMessage('svim: ' + error);
        }
        return acArg;
    };
}

/**
 * operation that takes no arguments
 */
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
        await enterNewLine(acArg, true, true);
        await setInsertMode(acArg);
        return acArg;
    }),
    "O": opActionWrapper(async (acArg: ActionArg) => {
        await enterNewLine(acArg, false, true);
        await setInsertMode(acArg);
        return acArg;
    }),
    "u": opActionWrapper(async (acArg: ActionArg) => {
        await vscode.commands.executeCommand('undo');
        return acArg;
    }),
    "p": opActionWrapper(async (acArg: ActionArg) => {
        let toInsert = acArg.v.getReg();
        if (toInsert && toInsert !== '^$') {
            if (toInsert.indexOf('^$') === 0) {
                toInsert = toInsert.slice(2);
                await enterNewLine(acArg, true);
            }
            toInsert = tool.stripRight(toInsert);
            await acArg.editor.edit((e) => {
                e.insert(acArg.editor.selection.active, <string>toInsert);
            });
        }
        return acArg;
    }),
    "P": opActionWrapper(async (acArg: ActionArg) => {
        let toInsert = acArg.v.getReg();
        if (toInsert && toInsert !== '^$') {
            if (toInsert.indexOf('^$') === 0) {
                toInsert = toInsert.slice(2);
                await enterNewLine(acArg, false);
            }
            toInsert = tool.stripRight(toInsert);
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
    "s": moveCursorWrapper(motion.startLineNonWhiteSpace),
    "e": moveCursorWrapper(motion.endLine),
    "G": async (acArg: ActionArg) => {
        let editor = acArg.editor;
        const lineCnt = editor.document.lineCount;
        const pos = new vscode.Position(lineCnt - 1, 0);
        editor.selection = new vscode.Selection(pos, pos);
        acArg.v.noticeMove(editor, pos);
        await vscode.commands.executeCommand('revealLine', {
            lineNumber: lineCnt - 1,
            at: 'center'
        });
        return acArg;
    },
    "D": async (acArg: ActionArg) => {
        if(acArg.editor) {
            await moveCursorWrapper(motion.down20)(acArg);
            const currentLine = acArg.editor.selection.active.line;
            await vscode.commands.executeCommand('revealLine', {
                lineNumber: currentLine, 
                at: 'center'
            });
        }
        return acArg;
    },
    "U": async (acArg: ActionArg) => {
        if(acArg.editor) {
            await moveCursorWrapper(motion.up20)(acArg);
            const currentLine = acArg.editor.selection.active.line;
            await vscode.commands.executeCommand('revealLine', {
                lineNumber: currentLine,
                at: 'center'
            });
        }
        return acArg;
    },
    "x": async (acArg: ActionArg) => {
        await acArg.editor.edit(e => {
            const curPos = acArg.editor.selection.active;
            e.delete(new vscode.Range(curPos, motion.rightChar(curPos)));
        });
        return acArg;
    },
    "J": strActionWrapper(['workbench.action.focusNextGroup']),
    "K": strActionWrapper(['workbench.action.focusPreviousGroup']),
    "H": strActionWrapper(['workbench.action.previousEditorInGroup']),
    "L": strActionWrapper(['workbench.action.nextEditorInGroup']),
    '|': async (acArg: ActionArg) => {
        if(acArg.strCmdArg) {
            await strActionWrapper(acArg.strCmdArg)(acArg);
        }
        return acArg;
    },
    "[": strActionWrapper(['workbench.action.navigateBack']),
    "]": strActionWrapper(['workbench.action.navigateForward']),
    "%": strActionWrapper(['editor.action.jumpToBracket']),
    "/": strActionWrapper(['editor.action.addCommentLine']),
    "\\": strActionWrapper(['editor.action.removeCommentLine'])
};
/**
 * operation that takes a range argument
 */
export let operation1Dict: ActionDict = {
    "d": opActionWrapper(operation.deleteRange),
    "y": opActionWrapper(operation.copyRange),
    ">": operation.indentRange,
    "<": operation.reIndentRange,
    "c": async (acArg: ActionArg) => {
            await operation.deleteRange(acArg);
            await setInsertMode(acArg);
            return acArg;
        }
};
/**
 * operation that takes a character argument
 */
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
        switch (acArg.arg) {
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
    },
    "g": async (acArg: ActionArg) => {
        const editor = acArg.editor;
        let toLine = editor.selection.active.line;
        switch (acArg.arg) {
            case 'g': {
                toLine = 0;
                let pos = new vscode.Position(0, 0);
                editor.selection = new vscode.Selection(pos, pos);
                acArg.v.noticeMove(editor, pos);
                break;
            }
            default: {
                break;
            }
        }
        await vscode.commands.executeCommand('revealLine', {
            lineNumber: toLine,
            at: 'center'
        });
        return acArg;
    }
};
/**
 * virtual commands: that has no concrete meaning itself but represents other commands
 */
export let virtualDict: ActionDict = {
    ".": async (acArg: ActionArg) => {
        let parseResult = acArg.v.getLastCmd();
        if (parseResult) {
            await runAction(parseResult, acArg.editor, acArg.v);
        }
        return acArg;
    }
};
/**
 * motion function that returns a range
 * used for interpreter to generate the range argument of an ActionArg
 */
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
/**
 * motion function that returns a range based on a given character
 * used for interpreter to generate the range argument of an ActionArg
 */
export let motion1Dict: Motion1Dict = {
    "f": motionArgWrapper(motion.nextCharOnLine),
    "F": motionArgWrapper(motion.previousCharOnLine),
    "i": (pos, c) => {
        let fstChar = c;
        let lstChar: string;
        if(c === '(') {
            lstChar = ')';
        } else if(c === '[') {
            lstChar = ']';
        } else if(c === '{') {
            lstChar = '}';
        } else if(c === '<') {
            lstChar = '>';
        } else if(c === '>') {
            lstChar = '<';  // for tags like <p>...</p>
        }else {
            lstChar = c;
        }
        const prePos = motion.previousCharOnLine(pos, fstChar);
        const nextPos = motion.nextCharOnLine(pos, lstChar);
        const prePosnext = motion.rightChar(prePos);
        return new vscode.Range(prePosnext, nextPos);
    }
};