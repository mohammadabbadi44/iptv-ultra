"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Cleaner: Remove duplicates, dead links, keep highest quality
const fs_1 = __importDefault(require("fs"));
function clean(entries) {
    // TODO: Remove duplicates, dead links, keep highest quality
    return entries;
}
const classified = JSON.parse(fs_1.default.readFileSync('vod-classified.json', 'utf8'));
for (const key of Object.keys(classified)) {
    classified[key] = clean(classified[key]);
}
fs_1.default.writeFileSync('vod-classified.json', JSON.stringify(classified, null, 2));
