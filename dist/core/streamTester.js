"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
            const results = (await Promise.resolve().then(() => __importStar(require('../../tests/__data__/input/playlist_test/results.js')))).default;
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
