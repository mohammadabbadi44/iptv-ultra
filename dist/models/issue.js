"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issue = void 0;
class Issue {
    constructor({ number, labels, data }) {
        this.number = number;
        this.labels = labels;
        this.data = data;
    }
}
exports.Issue = Issue;
