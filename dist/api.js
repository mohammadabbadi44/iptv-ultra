"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.loadData = loadData;
exports.downloadData = downloadData;
exports.searchChannels = searchChannels;
const core_1 = require("@freearhey/core");
const constants_1 = require("./constants");
const cli_progress_1 = __importDefault(require("cli-progress"));
const sdk = __importStar(require("@iptv-org/sdk"));
const data = {
    categoriesKeyById: new core_1.Dictionary(),
    countriesKeyByCode: new core_1.Dictionary(),
    subdivisionsKeyByCode: new core_1.Dictionary(),
    citiesKeyByCode: new core_1.Dictionary(),
    regionsKeyByCode: new core_1.Dictionary(),
    languagesKeyByCode: new core_1.Dictionary(),
    channelsKeyById: new core_1.Dictionary(),
    feedsKeyByStreamId: new core_1.Dictionary(),
    feedsGroupedByChannel: new core_1.Dictionary(),
    blocklistRecordsGroupedByChannel: new core_1.Dictionary(),
    categories: new core_1.Collection(),
    countries: new core_1.Collection(),
    subdivisions: new core_1.Collection(),
    cities: new core_1.Collection(),
    regions: new core_1.Collection()
};
exports.data = data;
let searchIndex;
async function loadData() {
    const dataManager = new sdk.DataManager({ dataDir: constants_1.DATA_DIR });
    await dataManager.loadFromDisk();
    dataManager.processData();
    const { channels, feeds, categories, languages, countries, subdivisions, cities, regions, blocklist } = dataManager.getProcessedData();
    searchIndex = sdk.SearchEngine.createIndex(channels);
    data.categoriesKeyById = categories.keyBy((category) => category.id);
    data.countriesKeyByCode = countries.keyBy((country) => country.code);
    data.subdivisionsKeyByCode = subdivisions.keyBy((subdivision) => subdivision.code);
    data.citiesKeyByCode = cities.keyBy((city) => city.code);
    data.regionsKeyByCode = regions.keyBy((region) => region.code);
    data.languagesKeyByCode = languages.keyBy((language) => language.code);
    data.channelsKeyById = channels.keyBy((channel) => channel.id);
    data.feedsKeyByStreamId = feeds.keyBy((feed) => feed.getStreamId());
    data.feedsGroupedByChannel = feeds.groupBy((feed) => feed.channel);
    data.blocklistRecordsGroupedByChannel = blocklist.groupBy((blocklistRecord) => blocklistRecord.channel);
    data.categories = categories;
    data.countries = countries;
    data.subdivisions = subdivisions;
    data.cities = cities;
    data.regions = regions;
}
async function downloadData() {
    function formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    const files = [
        'blocklist',
        'categories',
        'channels',
        'cities',
        'countries',
        'feeds',
        'guides',
        'languages',
        'logos',
        'regions',
        'streams',
        'subdivisions',
        'timezones'
    ];
    const multiBar = new cli_progress_1.default.MultiBar({
        stopOnComplete: true,
        hideCursor: true,
        forceRedraw: true,
        barsize: 36,
        format(options, params, payload) {
            const filename = payload.filename.padEnd(18, ' ');
            const barsize = options.barsize || 40;
            const percent = (params.progress * 100).toFixed(2);
            const speed = payload.speed ? formatBytes(payload.speed) + '/s' : 'N/A';
            const total = formatBytes(params.total);
            const completeSize = Math.round(params.progress * barsize);
            const incompleteSize = barsize - completeSize;
            const bar = options.barCompleteString && options.barIncompleteString
                ? options.barCompleteString.substr(0, completeSize) +
                    options.barGlue +
                    options.barIncompleteString.substr(0, incompleteSize)
                : '-'.repeat(barsize);
            return `${filename} [${bar}] ${percent}% | ETA: ${params.eta}s | ${total} | ${speed}`;
        }
    });
    const dataManager = new sdk.DataManager({ dataDir: constants_1.DATA_DIR });
    const requests = [];
    for (const basename of files) {
        const filename = `${basename}.json`;
        const progressBar = multiBar.create(0, 0, { filename });
        const request = dataManager.downloadFileToDisk(basename, {
            onDownloadProgress({ total, loaded, rate }) {
                if (total)
                    progressBar.setTotal(total);
                progressBar.update(loaded, { speed: rate });
            }
        });
        requests.push(request);
    }
    await Promise.allSettled(requests).catch(console.error);
}
function searchChannels(query) {
    if (!searchIndex)
        return new core_1.Collection();
    const results = searchIndex.search(query);
    const channels = new core_1.Collection();
    new core_1.Collection(results).forEach((item) => {
        const channel = data.channelsKeyById.get(item.id);
        if (channel)
            channels.add(channel);
    });
    return channels;
}
