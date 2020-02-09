import { getSvimEsc } from './config';
import { operation0Dict, operation1Dict, operation2Dict, motion0Dict, motion1Dict, virtualDict } from './action';

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
    virtual,
    None // invalid
}

export interface NormalResult {
    operationStr: string,
    motionStr: string,
    cntMotionStr: string,
    cntOperationStr: string,
    arg: string,
    isVirtual?: boolean,
}

function getCharType(c: string, state: ParseState): CharType {
    const isM0 = c in motion0Dict;
    const isM1 = c in motion1Dict;
    const isOp0 = c in operation0Dict;
    const isOp1 = c in operation1Dict;
    const isOp2 = c in operation2Dict;
    const isV = c in virtualDict;
    const isN = "1234567890".indexOf(c) !== -1;
    if(state === ParseState.motion) {
        if(isM0) {
            return CharType.motion0;
        } else if(isM1) {
            return CharType.motion1;
        } else if(isN) {
            return CharType.number;
        } else if(isOp1) {
            return CharType.operation1;
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
        } else if(isV) {
            return CharType.virtual;
        }
    }
    return CharType.None;
}

export class NormalParser
{
    /* used for parse commands used in normal mode */
    protected cntOperationStr: string = "";
    protected operationStr: string = "";
    protected cntMotionStr: string = "";
    protected motionStr: string = "";
    protected arg: string = "";
    protected state: ParseState = ParseState.operation;

    protected readOperationCnt: boolean = false;
    protected readMotionCnt: boolean = false;

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
    public _normal_compactReset(): NormalResult {
        const result = this._normal_compactState();
        this.reset();
        return result;
    }
    public parse(c: string): NormalResult | undefined  {
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
                    case CharType.virtual: {
                        this.operationStr = c[0];
                        let virtualResult = this._normal_compactReset();
                        virtualResult.isVirtual = true;
                        return virtualResult;
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
                    case CharType.operation1: {
                        this.motionStr = c[0];
                        return this._normal_compactReset();
                        // replicate commands in operation1 means select the whole line
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

export class VisualParser extends NormalParser
{
    constructor() {
        super();
    }
    public parse(c: string): NormalResult | undefined {
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
                        return this._normal_compactReset();
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
            case ParseState.arg: {
                this.arg = c[0];
                return this._normal_compactReset();
            }
            default: {
                return;
            }
        }
    }
}