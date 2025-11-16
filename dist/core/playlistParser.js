"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaylistParser = void 0;
const core_1 = require("@freearhey/core");
const iptv_playlist_parser_1 = __importDefault(require("iptv-playlist-parser"));
const models_1 = require("../models");
class PlaylistParser {
    constructor({ storage }) {
        this.storage = storage;
    }
    async parse(files) {
        const parsed = new core_1.Collection();
        for (const filepath of files) {
            if (!this.storage.existsSync(filepath))
                continue;
            const _parsed = await this.parseFile(filepath);
            parsed.concat(_parsed);
        }
        return parsed;
    }
    async parseFile(filepath) {
        const content = await this.storage.load(filepath);
        const parsed = iptv_playlist_parser_1.default.parse(content);
        const streams = new core_1.Collection();
        parsed.items.forEach((data) => {
            const stream = models_1.Stream.fromPlaylistItem(data);
            stream.filepath = filepath;
            streams.add(stream);
        });
        return streams;
    }
}
exports.PlaylistParser = PlaylistParser;
