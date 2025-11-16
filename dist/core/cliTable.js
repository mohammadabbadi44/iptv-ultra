"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliTable = void 0;
const console_table_printer_1 = require("console-table-printer");
class CliTable {
    constructor(options) {
        this.table = new console_table_printer_1.Table(options);
    }
    append(row) {
        this.table.addRow(row);
    }
    render() {
        this.table.printTable();
    }
    toString() {
        return this.table.render();
    }
}
exports.CliTable = CliTable;
