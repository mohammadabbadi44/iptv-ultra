"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesGenerator = void 0;
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const models_1 = require("../models");
class CategoriesGenerator {
    constructor({ streams, categories, logFile }) {
        this.streams = streams.clone();
        this.categories = categories;
        this.storage = new storage_js_1.Storage(constants_1.PUBLIC_DIR);
        this.logFile = logFile;
    }
    async generate() {
        const streams = this.streams.sortBy([(stream) => stream.title]);
        this.categories.forEach(async (category) => {
            const categoryStreams = streams
                .filter((stream) => stream.hasCategory(category))
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
            const playlist = new models_1.Playlist(categoryStreams, { public: true });
            const filepath = `categories/${category.id}.m3u`;
            await this.storage.save(filepath, playlist.toString());
            this.logFile.append(JSON.stringify({ type: 'category', filepath, count: playlist.streams.count() }) + constants_1.EOL);
        });
        const undefinedStreams = streams.filter((stream) => stream.getCategories().isEmpty());
        const playlist = new models_1.Playlist(undefinedStreams, { public: true });
        const filepath = 'categories/undefined.m3u';
        await this.storage.save(filepath, playlist.toString());
        this.logFile.append(JSON.stringify({ type: 'category', filepath, count: playlist.streams.count() }) + constants_1.EOL);
    }
}
exports.CategoriesGenerator = CategoriesGenerator;
