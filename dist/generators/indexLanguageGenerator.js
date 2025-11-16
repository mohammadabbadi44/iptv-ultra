"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexLanguageGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class IndexLanguageGenerator {
    constructor({ streams, logFile }) {
        this.streams = streams.clone();
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        let groupedStreams = new core_1.Collection();
        this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW())
            .forEach((stream) => {
            const streamLanguages = stream.getLanguages();
            if (streamLanguages.isEmpty()) {
                const streamClone = stream.clone();
                streamClone.groupTitle = 'Undefined';
                groupedStreams.add(streamClone);
                return;
            }
            streamLanguages.forEach((language) => {
                const streamClone = stream.clone();
                streamClone.groupTitle = language.name;
                groupedStreams.add(streamClone);
            });
        });
        groupedStreams = groupedStreams.sortBy((stream) => {
            if (stream.groupTitle === 'Undefined')
                return 'ZZ';
            return stream.groupTitle;
        });
        const playlist = new models_1.Playlist(groupedStreams, { public: true });
        const filepath = 'index.language.m3u';
        await this.storage.save(filepath, playlist.toString());
        this.logFile.append(JSON.stringify({ type: 'index', filepath, count: playlist.streams.count() }) + constants_1.EOL);
    }
}
exports.IndexLanguageGenerator = IndexLanguageGenerator;
