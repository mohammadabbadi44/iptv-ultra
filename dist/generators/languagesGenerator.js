"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguagesGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
const core_1 = require("@freearhey/core");
class LanguagesGenerator {
    constructor({ streams, logFile }) {
        this.streams = streams.clone();
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams
            .sortBy((stream) => stream.title)
            .filter((stream) => stream.isSFW());
        const languages = new core_1.Collection();
        streams.forEach((stream) => {
            languages.concat(stream.getLanguages());
        });
        languages
            .filter(Boolean)
            .uniqBy((language) => language.code)
            .sortBy((language) => language.name)
            .forEach(async (language) => {
            const languageStreams = streams.filter((stream) => stream.hasLanguage(language));
            if (languageStreams.isEmpty())
                return;
            const playlist = new models_1.Playlist(languageStreams, { public: true });
            const filepath = `languages/${language.code}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'language', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        });
        const undefinedStreams = streams.filter((stream) => stream.getLanguages().isEmpty());
        if (undefinedStreams.isEmpty())
            return;
        const playlist = new models_1.Playlist(undefinedStreams, { public: true });
        const filepath = 'languages/undefined.m3u';
        await this.storage.save(filepath, playlist.toString());
        this.logFile.append(JSON.stringify({ type: 'language', filepath, count: playlist.streams.count() }) + constants_1.EOL);
    }
}
exports.LanguagesGenerator = LanguagesGenerator;
