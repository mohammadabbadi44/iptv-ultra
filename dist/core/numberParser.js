"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NumberParser {
    async parse(number) {
        const parsed = parseInt(number);
        if (isNaN(parsed)) {
            throw new Error('numberParser:parse() Input value is not a number');
        }
        return parsed;
    }
}
exports.default = NumberParser;
