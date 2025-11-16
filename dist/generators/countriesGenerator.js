"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountriesGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class CountriesGenerator {
    constructor({ streams, countries, logFile }) {
        this.streams = streams.clone();
        this.countries = countries;
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW());
        const streamsGroupedByCountryCode = {};
        streams.forEach((stream) => {
            stream.getBroadcastCountries().forEach((country) => {
                if (streamsGroupedByCountryCode[country.code]) {
                    streamsGroupedByCountryCode[country.code].add(stream);
                }
                else {
                    streamsGroupedByCountryCode[country.code] = new core_1.Collection([stream]);
                }
            });
        });
        for (const countryCode in streamsGroupedByCountryCode) {
            const countryStreams = streamsGroupedByCountryCode[countryCode];
            const playlist = new models_1.Playlist(countryStreams, { public: true });
            const filepath = `countries/${countryCode.toLowerCase()}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'country', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        }
        const internationalStreams = streams.filter((stream) => stream.isInternational());
        const internationalPlaylist = new models_1.Playlist(internationalStreams, { public: true });
        const internationalFilepath = 'countries/int.m3u';
        await this.storage.save(internationalFilepath, internationalPlaylist.toString());
        this.logFile.append(JSON.stringify({
            type: 'country',
            filepath: internationalFilepath,
            count: internationalPlaylist.streams.count()
        }) + constants_1.EOL);
        const undefinedStreams = streams.filter((stream) => stream.getBroadcastAreaCodes().isEmpty());
        const undefinedPlaylist = new models_1.Playlist(undefinedStreams, { public: true });
        const undefinedFilepath = 'countries/undefined.m3u';
        await this.storage.save(undefinedFilepath, undefinedPlaylist.toString());
        this.logFile.append(JSON.stringify({
            type: 'country',
            filepath: undefinedFilepath,
            count: undefinedPlaylist.streams.count()
        }) + constants_1.EOL);
    }
}
exports.CountriesGenerator = CountriesGenerator;
