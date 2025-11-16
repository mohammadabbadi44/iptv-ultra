"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriesTable = void 0;
const core_1 = require("../core");
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../constants");
const core_2 = require("@freearhey/core");
const api_1 = require("../api");
class CategoriesTable {
    async create() {
        const parser = new core_1.LogParser();
        const logsStorage = new storage_js_1.Storage(constants_1.LOGS_DIR);
        const generatorsLog = await logsStorage.load('generators.log');
        let items = new core_2.Collection();
        parser
            .parse(generatorsLog)
            .filter((logItem) => logItem.type === 'category')
            .forEach((logItem) => {
            if (logItem.filepath.includes('undefined')) {
                items.add([
                    'ZZ',
                    'Undefined',
                    logItem.count.toString(),
                    `<code>https://iptv-org.github.io/iptv/${logItem.filepath}</code>`
                ]);
                return;
            }
            const file = new storage_js_1.File(logItem.filepath);
            const categoryId = file.name();
            const category = api_1.data.categoriesKeyById.get(categoryId);
            if (!category)
                return;
            items.add([
                category.name,
                category.name,
                logItem.count.toString(),
                `<code>https://iptv-org.github.io/iptv/${logItem.filepath}</code>`
            ]);
        });
        items = items
            .sortBy(item => item[0])
            .map(item => {
            item.shift();
            return item;
        });
        const columns = new core_2.Collection([
            { name: 'Category' },
            { name: 'Channels', align: 'right' },
            { name: 'Playlist', nowrap: true }
        ]);
        const table = new core_1.HTMLTable(items, columns);
        const readmeStorage = new storage_js_1.Storage(constants_1.README_DIR);
        await readmeStorage.save('_categories.md', table.toString());
    }
}
exports.CategoriesTable = CategoriesTable;
