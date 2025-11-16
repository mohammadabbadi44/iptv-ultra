"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@freearhey/core");
const storage_js_1 = require("@freearhey/storage-js");
const core_2 = require("../../core");
const api_1 = require("../../api");
const constants_1 = require("../../constants");
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
commander_1.program.argument('[filepath...]', 'Path to file to validate').parse(process.argv);
async function main() {
    const logger = new core_1.Logger();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const rootStorage = new storage_js_1.Storage(constants_1.ROOT_DIR);
    const parser = new core_2.PlaylistParser({
        storage: rootStorage
    });
    const files = commander_1.program.args.length ? commander_1.program.args : await rootStorage.list('streams/**/*.m3u');
    const streams = await parser.parse(files);
    logger.info(`found ${streams.count()} streams`);
    let errors = new core_1.Collection();
    let warnings = new core_1.Collection();
    const streamsGroupedByFilepath = streams.groupBy((stream) => stream.getFilepath());
    for (const filepath of streamsGroupedByFilepath.keys()) {
        const streams = streamsGroupedByFilepath.get(filepath);
        if (!streams)
            continue;
        const log = new core_1.Collection();
        const buffer = new core_1.Dictionary();
        streams.forEach((stream) => {
            if (stream.channel) {
                const channel = api_1.data.channelsKeyById.get(stream.channel);
                if (!channel) {
                    log.add({
                        type: 'warning',
                        line: stream.getLine(),
                        message: `"${stream.tvgId}" is not in the database`
                    });
                }
            }
            const duplicate = stream.url && buffer.has(stream.url);
            if (duplicate) {
                log.add({
                    type: 'warning',
                    line: stream.getLine(),
                    message: `"${stream.url}" is already on the playlist`
                });
            }
            else {
                buffer.set(stream.url, true);
            }
            if (stream.channel) {
                const blocklistRecords = new core_1.Collection(api_1.data.blocklistRecordsGroupedByChannel.get(stream.channel));
                blocklistRecords.forEach((blocklistRecord) => {
                    if (blocklistRecord.reason === 'dmca') {
                        log.add({
                            type: 'error',
                            line: stream.getLine(),
                            message: `"${blocklistRecord.channel}" is on the blocklist due to claims of copyright holders (${blocklistRecord.ref})`
                        });
                    }
                    else if (blocklistRecord.reason === 'nsfw') {
                        log.add({
                            type: 'error',
                            line: stream.getLine(),
                            message: `"${blocklistRecord.channel}" is on the blocklist due to NSFW content (${blocklistRecord.ref})`
                        });
                    }
                });
            }
        });
        if (log.isNotEmpty()) {
            console.log(`\n${chalk_1.default.underline(filepath)}`);
            log.forEach((logItem) => {
                const position = logItem.line.toString().padEnd(6, ' ');
                const type = logItem.type.padEnd(9, ' ');
                const status = logItem.type === 'error' ? chalk_1.default.red(type) : chalk_1.default.yellow(type);
                console.log(` ${chalk_1.default.gray(position)}${status}${logItem.message}`);
            });
            errors = errors.concat(log.filter((logItem) => logItem.type === 'error'));
            warnings = warnings.concat(log.filter((logItem) => logItem.type === 'warning'));
        }
    }
    if (errors.count() || warnings.count()) {
        console.log(chalk_1.default.red(`\n${errors.count() + warnings.count()} problems (${errors.count()} errors, ${warnings.count()} warnings)`));
        if (errors.count()) {
            process.exit(1);
        }
    }
}
main();
