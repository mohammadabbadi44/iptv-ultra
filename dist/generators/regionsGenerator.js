"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionsGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class RegionsGenerator {
    constructor({ streams, regions, logFile }) {
        this.streams = streams.clone();
        this.regions = regions;
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW());
        const streamsGroupedByRegionCode = {};
        streams.forEach((stream) => {
            stream.getBroadcastRegions().forEach((region) => {
                if (streamsGroupedByRegionCode[region.code]) {
                    streamsGroupedByRegionCode[region.code].add(stream);
                }
                else {
                    streamsGroupedByRegionCode[region.code] = new core_1.Collection([stream]);
                }
            });
        });
        for (const regionCode in streamsGroupedByRegionCode) {
            const regionStreams = streamsGroupedByRegionCode[regionCode];
            const playlist = new models_1.Playlist(regionStreams, { public: true });
            const filepath = `regions/${regionCode.toLowerCase()}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'region', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        }
    }
}
exports.RegionsGenerator = RegionsGenerator;
