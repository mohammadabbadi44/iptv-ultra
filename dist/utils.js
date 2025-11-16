"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isURI = isURI;
exports.normalizeURL = normalizeURL;
exports.truncate = truncate;
const normalize_url_1 = __importDefault(require("normalize-url"));
function isURI(string) {
    try {
        new URL(string);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function normalizeURL(url) {
    const normalized = (0, normalize_url_1.default)(url, { stripWWW: false });
    return decodeURIComponent(normalized).replace(/\s/g, '+').toString();
}
function truncate(string, limit = 100) {
    if (!string)
        return string;
    if (string.length < limit)
        return string;
    return string.slice(0, limit - 3) + '...';
}
