"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegionsTable = void 0;
const constants_1 = require("../constants");
const storage_js_1 = require("@freearhey/storage-js");
const core_1 = require("../core");
const core_2 = require("@freearhey/core");
const api_1 = require("../api");
class RegionsTable {
    async create() {
        const parser = new core_1.LogParser();
        const logsStorage = new storage_js_1.Storage(constants_1.LOGS_DIR);
        const generatorsLog = await logsStorage.load('generators.log');
        const parsed = parser.parse(generatorsLog);
        const logRegions = parsed.filter((logItem) => logItem.type === 'region');
        let items = new core_2.Collection();
        api_1.data.regions.forEach((region) => {
            const logItem = logRegions.find((logItem) => logItem.filepath === `regions/${region.code.toLowerCase()}.m3u`);
            if (!logItem)
                return;
            items.add({
                name: region.name,
                count: logItem.count,
                link: `https://iptv-org.github.io/iptv/${logItem.filepath}`
            });
        });
        items = items.sortBy(item => item.name);
        const output = items
            .map(item => {
            return `- ${item.name} <code>${item.link}</code>`;
        })
            .join('\r\n');
        const readmeStorage = new storage_js_1.Storage(constants_1.README_DIR);
        await readmeStorage.save('_regions.md', output);
    }
}
exports.RegionsTable = RegionsTable;
