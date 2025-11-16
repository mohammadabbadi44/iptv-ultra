"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class CitiesGenerator {
    constructor({ streams, cities, logFile }) {
        this.streams = streams.clone();
        this.cities = cities;
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW());
        const streamsGroupedByCityCode = {};
        streams.forEach((stream) => {
            stream.getBroadcastCities().forEach((city) => {
                if (streamsGroupedByCityCode[city.code]) {
                    streamsGroupedByCityCode[city.code].add(stream);
                }
                else {
                    streamsGroupedByCityCode[city.code] = new core_1.Collection([stream]);
                }
            });
        });
        for (const cityCode in streamsGroupedByCityCode) {
            const cityStreams = streamsGroupedByCityCode[cityCode];
            const playlist = new models_1.Playlist(cityStreams, { public: true });
            const filepath = `cities/${cityCode.toLowerCase()}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'city', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        }
    }
}
exports.CitiesGenerator = CitiesGenerator;
