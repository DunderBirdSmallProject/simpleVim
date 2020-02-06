import * as vscode from 'vscode';
import { Mode, Vim } from './vim';
import { NormalResult } from './parser';
import * as motion from './motion';

interface Operation {
    (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string): void;
}
interface CompileResult {
    repeat: number,
    operation: Operation,
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
type OperationDict = {
    [c: string]: Operation;
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
function isOperation(opStr: string): boolean {
    return opStr in operation0Dict || opStr in operation1Dict || opStr in operation2Dict;
}
function isMotion(opStr: string): boolean {
    return opStr in motion0Dict || opStr in motion1Dict;
}
function setInsertMode(editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string): void {
    v.setMode(Mode.INSERT);
}
function moveCursorWrapper(motionFunc: Pos2Pos) {
    return (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string) => {
        const curPos = editor.selection.active;
        const nextPos = motionFunc(curPos);
        editor.selection = new vscode.Selection(nextPos, nextPos);
    };
}
function moveCursorArgWrapper(motionFunc: PosArg2Pos) {
    return (editor: vscode.TextEditor, v: Vim, range: vscode.Range, arg: string) => {
        const curPos = editor.selection.active;
        const nextPos = motionFunc(curPos, arg);
        editor.selection = new vscode.Selection(nextPos, nextPos);
    };
}

export function compile(parseResult: NormalResult): CompileResult | undefined {
    if(vscode.window.activeTextEditor && isOperation(parseResult.operationStr)) {
        const isOperation1 = parseResult.operationStr in operation1Dict;
        const isOperation0 = parseResult.operationStr in operation0Dict;
        const curPos = vscode.window.activeTextEditor.selection.active;
        let f: Operation;
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


export let operation0Dict: OperationDict = {
    "i": setInsertMode,
    "a": (editor, v, range, arg) => {
        moveCursorWrapper(motion.rightChar)(editor, v, range, arg);
        setInsertMode(editor, v, range, arg);
    },
    "h": moveCursorWrapper(motion.leftChar),
    "j": moveCursorWrapper(motion.downChar),
    "k": moveCursorWrapper(motion.upChar),
    "l": moveCursorWrapper(motion.rightChar),
    "w": moveCursorWrapper(motion.nextWordOnLine),
    "b": moveCursorWrapper(motion.lastWordOnLine),
    "s": moveCursorWrapper(motion.startLine),
    "e": moveCursorWrapper(motion.endLine),
    "0": moveCursorWrapper(motion.startLine),
};
export let operation1Dict: OperationDict = {

};
export let operation2Dict: OperationDict = {
    "f": moveCursorArgWrapper(motion.nextCharOnLine),
    "F": moveCursorArgWrapper(motion.previousCharOnLine)
};

export let motion0Dict: Motion0Dict = {
    "w": motionWrapper(motion.nextWordOnLine),
    "h": motionWrapper(motion.leftChar),
    "j": motionWrapper(motion.downChar),
    "k": motionWrapper(motion.upChar),
    "l": motionWrapper(motion.rightChar)
};

export let motion1Dict: Motion1Dict = {
    "f": motionArgWrapper(motion.nextCharOnLine),
    "i": (pos, c) => {
        const prePos = motion.previousCharOnLine(pos, c);
        const nextPos = motion.nextCharOnLine(pos, c);
        return new vscode.Range(prePos, nextPos);
    }
};