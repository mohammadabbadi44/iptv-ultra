"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueParser = void 0;
const core_1 = require("@freearhey/core");
const issueData_1 = require("./issueData");
const models_1 = require("../models");
const FIELDS = new core_1.Dictionary({
    'Stream ID': 'streamId',
    'Channel ID': 'channelId',
    'Feed ID': 'feedId',
    'Stream URL': 'streamUrl',
    'New Stream URL': 'newStreamUrl',
    Label: 'label',
    Quality: 'quality',
    'HTTP User-Agent': 'httpUserAgent',
    'HTTP User Agent': 'httpUserAgent',
    'HTTP Referrer': 'httpReferrer',
    'What happened to the stream?': 'reason',
    Reason: 'reason',
    Notes: 'notes',
    Directives: 'directives'
});
class IssueParser {
    parse(issue) {
        const fields = typeof issue.body === 'string' ? issue.body.split('###') : [];
        const data = new core_1.Dictionary();
        fields.forEach((field) => {
            const parsed = typeof field === 'string' ? field.split(/\r?\n/).filter(Boolean) : [];
            let _label = parsed.shift();
            _label = _label ? _label.replace(/ \(optional\)| \(required\)/, '').trim() : '';
            let _value = parsed.join('\r\n');
            _value = _value ? _value.trim() : '';
            if (!_label || !_value)
                return data;
            const id = FIELDS.get(_label);
            const value = _value === '_No response_' || _value === 'None' ? '' : _value;
            if (!id)
                return;
            data.set(id, value);
        });
        const labels = issue.labels.map(label => label.name);
        return new models_1.Issue({ number: issue.number, labels, data: new issueData_1.IssueData(data) });
    }
}
exports.IssueParser = IssueParser;
