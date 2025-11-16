"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const storage_js_1 = require("@freearhey/storage-js");
const core_1 = require("../../core");
const core_2 = require("@freearhey/core");
const api_1 = require("../../api");
async function main() {
    const logger = new core_2.Logger();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const streamsStorage = new storage_js_1.Storage(constants_1.STREAMS_DIR);
    const parser = new core_1.PlaylistParser({
        storage: streamsStorage
    });
    const files = await streamsStorage.list('**/*.m3u');
    const parsed = await parser.parse(files);
    const _streams = parsed
        .sortBy((stream) => stream.getId())
        .map((stream) => stream.toObject());
    logger.info(`found ${_streams.count()} streams`);
    logger.info('saving to .api/streams.json...');
    const apiStorage = new storage_js_1.Storage(constants_1.API_DIR);
    await apiStorage.save('streams.json', _streams.toJSON());
}
main();
