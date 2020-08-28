export { stripRight };
function stripRight(str: string): string {
    while (str.length > 0) {
        const finalChar = str.charAt(str.length - 1);
        if (finalChar === '\n' || finalChar === '\r') {
            str = str.slice(0, str.length - 1);
        } else {
            break;
        }
    }
    return str;
}