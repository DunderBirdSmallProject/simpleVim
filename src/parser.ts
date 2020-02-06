import { getSvimEsc } from './config';
import { operation0Dict, operation1Dict, operation2Dict, motion0Dict, motion1Dict } from './action';
import { Vim } from './vim';

enum ParseState {
    operation,
    motion,
    arg
}
enum CharType {
    operation0, // operation that takes no argument 
    operation1, // operation that takes one range argument
    operation2, // operation that takes one arg
    motion0, // motion operation that takes no argument
    motion1, // motion operation that takes one argument
    number,
    None // invalid
}

export interface NormalResult {
    operationStr: string,
    motionStr: string,
    cntMotionStr: string,
    cntOperationStr: string,
    arg: string,
}

function getCharType(c: string, state: ParseState): CharType {
    const isM0 = c in motion0Dict;
    const isM1 = c in motion1Dict;
    const isOp0 = c in operation0Dict;
    const isOp1 = c in operation1Dict;
    const isOp2 = c in operation2Dict;
    const isN = "123456789".indexOf(c) !== -1;
    if(state === ParseState.motion) {
        if(isM0) {
            return CharType.motion0;
        } else if(isM1) {
            return CharType.motion1;
        } else if(isN) {
            return CharType.number;
        }
    } else if(state === ParseState.operation) {
        if(isOp0) {
            return CharType.operation0;
        } else if(isOp1) {
            return CharType.operation1;
        } else if(isOp2) {
            return CharType.operation2;
        } else if(isN) {
            return CharType.number;
        }
    }
    return CharType.None;
}

export class NormalParser
{
    /* used for parse commands used in normal mode */
    private cntOperationStr: string = "";
    private operationStr: string = "";
    private cntMotionStr: string = "";
    private motionStr: string = "";
    private arg: string = "";
    private state: ParseState = ParseState.operation;

    private readOperationCnt: boolean = false;
    private readMotionCnt: boolean = false;

    constructor() {
        this.reset();
    }
    public reset() {
        this.state = ParseState.operation;
        this.motionStr = "";
        this.cntMotionStr = "";
        this.cntOperationStr = "";
        this.operationStr ="";
        this.arg = "";
        this.readOperationCnt = false;
        this.readMotionCnt = false;

    }
    private _normal_compactState(): NormalResult {
        let realCntMotionStr: string;
        let realCntOperationStr: string;
        realCntMotionStr = this.readMotionCnt ? this.cntMotionStr : "1";
        realCntOperationStr = this.readOperationCnt ? this.cntOperationStr : "1";
        return {
            operationStr: this.operationStr,
            motionStr: this.motionStr,
            cntMotionStr: realCntMotionStr,
            cntOperationStr: realCntOperationStr,
            arg: this.arg
        };
    }
    private _normal_compactReset(): NormalResult {
        const result = this._normal_compactState();
        this.reset();
        return result;
    }
    private _normal_parse(c: string): NormalResult | undefined  {
        const cType = getCharType(c, this.state);
        switch(this.state) {
            case ParseState.operation: {
                switch(cType) {
                    case CharType.number: {
                        this.cntOperationStr += c[0];
                        this.readOperationCnt = true;
                        break;
                    }
                    case CharType.operation0: {
                        this.operationStr = c[0];
                        return this._normal_compactReset();
                    }
                    case CharType.operation1: {
                        this.operationStr = c[0];
                        this.state = ParseState.motion;
                        break;
                    }
                    case CharType.operation2: {
                        this.operationStr = c[0];
                        this.state = ParseState.arg;
                        break;
                    }
                    default: {
                        return;
                    }
                }
                break;
            }
            case ParseState.motion: {
                switch(cType) {
                    case CharType.number: {
                        this.cntMotionStr += c[0];
                        this.readMotionCnt = true;
                        break;
                    }
                    case CharType.motion0: {
                        this.motionStr = c[0];
                        return this._normal_compactReset();
                    }
                    case CharType.motion1: {
                        this.state = ParseState.arg;
                        this.motionStr = c[0];
                        break;
                    }
                    default: {
                        return;
                    }
                }
                break;
            }
            case ParseState.arg: {
                this.arg = c[0];
                return this._normal_compactReset();
            }
        }
    }
    public parse(input: string): NormalResult | undefined {
        return this._normal_parse(input);
    }
};

export class InsertParser
{
    private buffer: string;
    private escStr: string;
    
    constructor() {
        this.buffer = "";
        this.escStr = getSvimEsc();
    }
    public reset() {
        this.buffer = "";
        this.escStr = getSvimEsc();
    }
    public parse(input: string) {
        this.buffer += input[0];
        if(this.escStr.indexOf(this.buffer) === 0) {
            if(this.escStr === this.buffer) {
                return true;
            }
        } 
        else {
            this.buffer = "";
        }
        return false;
    }
}