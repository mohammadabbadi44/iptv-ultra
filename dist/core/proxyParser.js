"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyParser = void 0;
const node_url_1 = require("node:url");
class ProxyParser {
    parse(_url) {
        const parsed = new node_url_1.URL(_url);
        const result = {
            protocol: parsed.protocol.replace(':', '') || null,
            host: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port) : null
        };
        if (parsed.username || parsed.password) {
            result.auth = {};
            if (parsed.username)
                result.auth.username = parsed.username;
            if (parsed.password)
                result.auth.password = parsed.password;
        }
        return result;
    }
}
exports.ProxyParser = ProxyParser;
