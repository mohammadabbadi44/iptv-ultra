"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@freearhey/core");
const models_1 = require("../../models");
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../../constants");
const core_2 = require("../../core");
const api_1 = require("../../api");
const commander_1 = require("commander");
const node_path_1 = __importDefault(require("node:path"));
commander_1.program.argument('[filepath...]', 'Path to file to format').parse(process.argv);
async function main() {
    const logger = new core_1.Logger();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const streamsStorage = new storage_js_1.Storage(constants_1.STREAMS_DIR);
    const parser = new core_2.PlaylistParser({
        storage: streamsStorage
    });
    let files = commander_1.program.args.length ? commander_1.program.args : await streamsStorage.list('**/*.m3u');
    files = files.map((filepath) => node_path_1.default.basename(filepath));
    let streams = await parser.parse(files);
    logger.info(`found ${streams.count()} streams`);
    logger.info('normalizing links...');
    streams = streams.map(stream => {
        stream.normalizeURL();
        return stream;
    });
    logger.info('removing duplicates...');
    streams = streams.uniqBy(stream => stream.url);
    logger.info('removing wrong id...');
    streams = streams.map((stream) => {
        const channel = stream.getChannel();
        if (channel)
            return stream;
        stream.tvgId = '';
        stream.channel = '';
        stream.feed = '';
        return stream;
    });
    logger.info('adding the missing feed id...');
    streams = streams.map((stream) => {
        const feed = stream.getFeed();
        if (feed) {
            stream.feed = feed.id;
            stream.tvgId = stream.getId();
        }
        return stream;
    });
    logger.info('sorting links...');
    streams = streams.sortBy([
        (stream) => stream.title,
        (stream) => stream.getVerticalResolution(),
        (stream) => stream.label,
        (stream) => stream.url
    ], ['asc', 'desc', 'asc', 'asc']);
    logger.info('saving...');
    const groupedStreams = streams.groupBy((stream) => stream.getFilepath());
    for (const filepath of groupedStreams.keys()) {
        const streams = new core_1.Collection(groupedStreams.get(filepath));
        if (streams.isEmpty())
            return;
        const playlist = new models_1.Playlist(streams, { public: false });
        await streamsStorage.save(filepath, playlist.toString());
    }
}
main();
