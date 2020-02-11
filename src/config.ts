import * as vscode from 'vscode';

export function getWordSeparatorConfig(): string {
    let editorConfig = vscode.workspace.getConfiguration('editor');
    return editorConfig['wordSeparators'];
}

export function isWordSeparator(c: String): boolean {
    return getWordSeparatorConfig().indexOf(c[0]) !== -1;
}

export function getSvimEsc(): string {
    return ",jk";
}

interface CmdStr {
    [index: string]: string[]
}

let cmdList = vscode.workspace.getConfiguration().get<CmdStr>('svim.svimCmd');

export function isprefixOfCmd(str: string): boolean {
    for(let cmdStr in cmdList) {
        if(cmdStr.indexOf(str) === 0) {
            return true;
        }
    }
    return false;
}
export function getCmd(str: string): string[] | undefined {
    if(cmdList && str in cmdList) {
        return cmdList[str];
    }
}
