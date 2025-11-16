"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubdivisionsGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class SubdivisionsGenerator {
    constructor({ streams, subdivisions, logFile }) {
        this.streams = streams.clone();
        this.subdivisions = subdivisions;
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW());
        const streamsGroupedBySubdivisionCode = {};
        streams.forEach((stream) => {
            stream.getBroadcastSubdivisions().forEach((subdivision) => {
                if (streamsGroupedBySubdivisionCode[subdivision.code]) {
                    streamsGroupedBySubdivisionCode[subdivision.code].add(stream);
                }
                else {
                    streamsGroupedBySubdivisionCode[subdivision.code] = new core_1.Collection([stream]);
                }
            });
        });
        for (const subdivisionCode in streamsGroupedBySubdivisionCode) {
            const subdivisionStreams = streamsGroupedBySubdivisionCode[subdivisionCode];
            const playlist = new models_1.Playlist(subdivisionStreams, { public: true });
            const filepath = `subdivisions/${subdivisionCode.toLowerCase()}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'subdivision', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        }
    }
}
exports.SubdivisionsGenerator = SubdivisionsGenerator;
