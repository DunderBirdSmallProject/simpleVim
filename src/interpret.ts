import * as vscode from 'vscode';
import { Action, ActionArg, isOperation, operation0Dict, operation1Dict, operation2Dict } from './action';
import { isMotion, motion0Dict, motion1Dict, virtualDict } from './action';
import { NormalResult } from './parser';
import * as motion from './motion';
import { Vim, Mode } from './vim';

interface CompileResult {
    repeat: number,
    operation: Action,
    range: vscode.Range,
    arg: string,
    lineOp?: boolean,
    strCmdArg?: string[]
}

function compile(parseResult: NormalResult): CompileResult | undefined {
    const editor = vscode.window.activeTextEditor;
    if(!editor) {
        return;
    }
    const curPos = editor.selection.active;
    const isOperation1 = parseResult.operationStr in operation1Dict;
    const isOperation0 = parseResult.operationStr in operation0Dict;
    if(parseResult.operationStr in virtualDict) {
        return {
            repeat: 1,
            operation: virtualDict[parseResult.operationStr],
            range: new vscode.Range(curPos, curPos),
            arg: parseResult.arg,
        };
    }
    else if(isOperation(parseResult.operationStr)) {
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
            strCmdArg: parseResult.strCmd,
        };
        
        if(parseResult.motionStr !== "" && isOperation1) {
            if(parseResult.motionStr === parseResult.operationStr) {
                // replicate commands in operation1 means select the whole line
                compileResult.range = motion.wholeLineWithSep(editor, curPos);
                compileResult.lineOp = true;
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
        if(parseResult.operationStr in operation1Dict && v.getMode() === Mode.VISUAL) {
            compileResult.range = new vscode.Range(editor.selection.start, editor.selection.end);
            if(v.getVisualLine()) {
                compileResult.lineOp = true;
            }
            compileResult.repeat = 1;
        }
        const repeat = compileResult.repeat;
        for(let i = 0; i < repeat; i++) {
            if(!compileResult) {
                break;
            }
            await compileResult.operation({
                editor: editor,
                v: v,
                range: compileResult.range,
                arg: compileResult.arg,
                lineOp: compileResult.lineOp,
                strCmdArg: compileResult.strCmdArg
            });
            compileResult = compile(parseResult);
        }
    }
}