"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogParser = void 0;
class LogParser {
    parse(content) {
        if (!content)
            return [];
        const lines = content.split('\n');
        return lines.map(line => (line ? JSON.parse(line) : null)).filter(l => l);
    }
}
exports.LogParser = LogParser;
