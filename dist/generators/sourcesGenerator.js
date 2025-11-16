"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SourcesGenerator = void 0;
const core_1 = require("@freearhey/core");
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
class SourcesGenerator {
    constructor({ streams, logFile }) {
        this.streams = streams.clone();
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const files = this.streams.groupBy((stream) => stream.getFilename());
        for (const filename of files.keys()) {
            if (!filename)
                continue;
            const streams = new core_1.Collection(files.get(filename)).map((stream) => {
                const groupTitle = stream
                    .getCategories()
                    .map(category => category.name)
                    .sort()
                    .join(';');
                if (groupTitle)
                    stream.groupTitle = groupTitle;
                return stream;
            });
            const playlist = new models_1.Playlist(streams, { public: true });
            const filepath = `sources/${filename}`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'source', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        }
    }
}
exports.SourcesGenerator = SourcesGenerator;
