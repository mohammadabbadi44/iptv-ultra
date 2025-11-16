"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
class IndexGenerator {
    constructor({ streams, logFile }) {
        this.streams = streams.clone();
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const sfwStreams = this.streams
            .sortBy(stream => stream.title)
            .filter((stream) => stream.isSFW())
            .map((stream) => {
            const groupTitle = stream
                .getCategories()
                .map(category => category.name)
                .sort()
                .join(';');
            if (groupTitle)
                stream.groupTitle = groupTitle;
            return stream;
        });
        const playlist = new models_1.Playlist(sfwStreams, { public: true });
        const filepath = 'index.m3u';
        await this.storage.save(filepath, playlist.toString());
        this.logFile.append(JSON.stringify({ type: 'index', filepath, count: playlist.streams.count() }) + constants_1.EOL);
    }
}
exports.IndexGenerator = IndexGenerator;
