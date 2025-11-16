"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tables_1 = require("../../tables");
const constants_1 = require("../../constants");
const core_1 = require("@freearhey/core");
const core_2 = require("../../core");
const api_1 = require("../../api");
async function main() {
    const logger = new core_1.Logger();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('creating category table...');
    await new tables_1.CategoriesTable().create();
    logger.info('creating language table...');
    await new tables_1.LanguagesTable().create();
    logger.info('creating countires table...');
    await new tables_1.CountriesTable().create();
    logger.info('creating region table...');
    await new tables_1.RegionsTable().create();
    logger.info('updating playlists.md...');
    const playlists = new core_2.Markdown({
        build: `${constants_1.ROOT_DIR}/PLAYLISTS.md`,
        template: `${constants_1.README_DIR}/template.md`
    });
    playlists.compile();
}
main();
