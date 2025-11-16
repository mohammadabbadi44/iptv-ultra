"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../../constants");
const storage_js_1 = require("@freearhey/storage-js");
const core_1 = require("../../core");
const api_1 = require("../../api");
const core_2 = require("@freearhey/core");
const lodash_uniqueid_1 = __importDefault(require("lodash.uniqueid"));
const generators_1 = require("../../generators");
async function main() {
    const logger = new core_2.Logger();
    const logFile = new storage_js_1.File('generators.log');
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const streamsStorage = new storage_js_1.Storage(constants_1.STREAMS_DIR);
    const parser = new core_1.PlaylistParser({
        storage: streamsStorage
    });
    const files = await streamsStorage.list('**/*.m3u');
    let streams = await parser.parse(files);
    const totalStreams = streams.count();
    logger.info(`found ${totalStreams} streams`);
    logger.info('generating raw/...');
    await new generators_1.RawGenerator({ streams, logFile }).generate();
    logger.info('filtering streams...');
    streams = streams.uniqBy((stream) => stream.getId() || (0, lodash_uniqueid_1.default)());
    logger.info('sorting streams...');
    streams = streams.sortBy([
        (stream) => stream.getId(),
        (stream) => stream.getVerticalResolution(),
        (stream) => stream.label
    ], ['asc', 'asc', 'desc']);
    const { categories, countries, subdivisions, cities, regions } = api_1.data;
    logger.info('generating categories/...');
    await new generators_1.CategoriesGenerator({ categories, streams, logFile }).generate();
    logger.info('generating languages/...');
    await new generators_1.LanguagesGenerator({ streams, logFile }).generate();
    logger.info('generating countries/...');
    await new generators_1.CountriesGenerator({
        countries,
        streams,
        logFile
    }).generate();
    logger.info('generating subdivisions/...');
    await new generators_1.SubdivisionsGenerator({
        subdivisions,
        streams,
        logFile
    }).generate();
    logger.info('generating cities/...');
    await new generators_1.CitiesGenerator({
        cities,
        streams,
        logFile
    }).generate();
    logger.info('generating regions/...');
    await new generators_1.RegionsGenerator({
        streams,
        regions,
        logFile
    }).generate();
    logger.info('generating sources/...');
    await new generators_1.SourcesGenerator({ streams, logFile }).generate();
    logger.info('generating index.m3u...');
    await new generators_1.IndexGenerator({ streams, logFile }).generate();
    logger.info('generating index.category.m3u...');
    await new generators_1.IndexCategoryGenerator({ streams, logFile }).generate();
    logger.info('generating index.country.m3u...');
    await new generators_1.IndexCountryGenerator({
        streams,
        logFile
    }).generate();
    logger.info('generating index.language.m3u...');
    await new generators_1.IndexLanguageGenerator({ streams, logFile }).generate();
    logger.info('saving generators.log...');
    const logStorage = new storage_js_1.Storage(constants_1.LOGS_DIR);
    logStorage.saveFile(logFile);
}
main();
