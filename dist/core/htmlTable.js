"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTMLTable = void 0;
class HTMLTable {
    constructor(data, columns) {
        this.data = data;
        this.columns = columns;
    }
    toString() {
        let output = '<table>\r\n';
        output += '  <thead>\r\n    <tr>';
        this.columns.forEach((column) => {
            output += `<th align="left">${column.name}</th>`;
        });
        output += '</tr>\r\n  </thead>\r\n';
        output += '  <tbody>\r\n';
        this.data.forEach((item) => {
            output += '    <tr>';
            let i = 0;
            for (const prop in item) {
                const column = this.columns.all()[i];
                const nowrap = column.nowrap ? ' nowrap' : '';
                const align = column.align ? ` align="${column.align}"` : '';
                output += `<td${align}${nowrap}>${item[prop]}</td>`;
                i++;
            }
            output += '</tr>\r\n';
        });
        output += '  </tbody>\r\n';
        output += '</table>';
        return output;
    }
}
exports.HTMLTable = HTMLTable;
