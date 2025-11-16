"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamTester = void 0;
const axios_1 = __importDefault(require("axios"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const proxyParser_js_1 = require("./proxyParser.js");
const mediainfo_js_1 = __importDefault(require("mediainfo.js"));
const constants_1 = require("../constants");
class StreamTester {
    constructor({ options }) {
        const proxyParser = new proxyParser_js_1.ProxyParser();
        let request = {
            responseType: 'arraybuffer'
        };
        if (options.proxy !== undefined) {
            const proxy = proxyParser.parse(options.proxy);
            if (proxy.protocol &&
                ['socks', 'socks5', 'socks5h', 'socks4', 'socks4a'].includes(String(proxy.protocol))) {
                const socksProxyAgent = new socks_proxy_agent_1.SocksProxyAgent(options.proxy);
                request = Object.assign(Object.assign({}, request), { httpAgent: socksProxyAgent, httpsAgent: socksProxyAgent });
            }
            else {
                request = Object.assign(Object.assign({}, request), { proxy });
            }
        }
        this.client = axios_1.default.create(request);
        this.options = options;
    }
    async test(stream) {
        var _a, _b;
        if (constants_1.TESTING) {
            const results = (await import('../../tests/__data__/input/playlist_test/results.js')).default;
            return results[stream.url];
        }
        else {
            try {
                const res = await this.client(stream.url, {
                    signal: AbortSignal.timeout(this.options.timeout),
                    headers: {
                        'User-Agent': stream.user_agent || 'Mozilla/5.0',
                        Referer: stream.referrer
                    }
                });
                const mediainfo = await (0, mediainfo_js_1.default)({ format: 'object' });
                const buffer = await res.data;
                const result = await mediainfo.analyzeData(() => buffer.byteLength, (size, offset) => Buffer.from(buffer).subarray(offset, offset + size));
                if (result && result.media && result.media.track.length > 0) {
                    return {
                        status: {
                            ok: true,
                            code: 'OK'
                        }
                    };
                }
                else {
                    return {
                        status: {
                            ok: false,
                            code: 'NO_VIDEO'
                        }
                    };
                }
            }
            catch (err) {
                const error = err;
                let code = 'UNKNOWN_ERROR';
                if (error.name === 'CanceledError') {
                    code = 'TIMEOUT';
                }
                else if (error.name === 'AxiosError') {
                    if (error.response) {
                        const status = (_a = error.response) === null || _a === void 0 ? void 0 : _a.status;
                        const statusText = (_b = error.response) === null || _b === void 0 ? void 0 : _b.statusText.toUpperCase().replace(/\s+/, '_');
                        code = `HTTP_${status}_${statusText}`;
                    }
                    else {
                        code = `AXIOS_${error.code}`;
                    }
                }
                else if (error.cause) {
                    const cause = error.cause;
                    if (cause.code) {
                        code = cause.code;
                    }
                    else {
                        code = cause.name;
                    }
                }
                return {
                    status: {
                        ok: false,
                        code
                    }
                };
            }
        }
    }
}
exports.StreamTester = StreamTester;
