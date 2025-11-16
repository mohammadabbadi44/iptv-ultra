"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueData = void 0;
class IssueData {
    constructor(data) {
        this._data = data;
    }
    has(key) {
        return this._data.has(key);
    }
    missing(key) {
        return this._data.missing(key) || this._data.get(key) === undefined;
    }
    getBoolean(key) {
        return Boolean(this._data.get(key));
    }
    getString(key) {
        const deleteSymbol = '~';
        return this._data.get(key) === deleteSymbol ? '' : this._data.get(key);
    }
    getArray(key) {
        const deleteSymbol = '~';
        if (this._data.missing(key))
            return undefined;
        const value = this._data.get(key);
        return !value || value === deleteSymbol ? [] : value.split('\r\n');
    }
}
exports.IssueData = IssueData;
