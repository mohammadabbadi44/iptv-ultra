"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../core");
const constants_1 = require("../../constants");
const core_2 = require("@freearhey/core");
const commander_1 = require("commander");
const storage_js_1 = require("@freearhey/storage-js");
const api_1 = require("../../api");
const async_1 = require("async");
const node_dns_1 = __importDefault(require("node:dns"));
const chalk_1 = __importDefault(require("chalk"));
const node_os_1 = __importDefault(require("node:os"));
const utils_1 = require("../../utils");
const LIVE_UPDATE_INTERVAL = 5000;
const LIVE_UPDATE_MAX_STREAMS = 100;
let errors = 0;
let warnings = 0;
const results = {};
let interval;
let streams = new core_2.Collection();
let isLiveUpdateEnabled = true;
commander_1.program
    .argument('[filepath...]', 'Path to file to test')
    .option('-p, --parallel <number>', 'Batch size of streams to test concurrently', (value) => parseInt(value), node_os_1.default.cpus().length)
    .option('-x, --proxy <url>', 'Use the specified proxy')
    .option('-t, --timeout <number>', 'The number of milliseconds before the request will be aborted', (value) => parseInt(value), 30000)
    .parse(process.argv);
const options = commander_1.program.opts();
const logger = new core_2.Logger();
const tester = new core_1.StreamTester({ options });
async function main() {
    if (await isOffline()) {
        logger.error(chalk_1.default.red('Internet connection is required for the script to work'));
        return;
    }
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const rootStorage = new storage_js_1.Storage(constants_1.ROOT_DIR);
    const parser = new core_1.PlaylistParser({
        storage: rootStorage
    });
    const files = commander_1.program.args.length ? commander_1.program.args : await rootStorage.list(`${constants_1.STREAMS_DIR}/*.m3u`);
    streams = await parser.parse(files);
    logger.info(`found ${streams.count()} streams`);
    if (streams.count() > LIVE_UPDATE_MAX_STREAMS)
        isLiveUpdateEnabled = false;
    logger.info('starting...');
    if (!isLiveUpdateEnabled) {
        drawTable();
        interval = setInterval(() => {
            drawTable();
        }, LIVE_UPDATE_INTERVAL);
    }
    (0, async_1.eachLimit)(streams.all(), options.parallel, async (stream) => {
        await runTest(stream);
        if (isLiveUpdateEnabled) {
            drawTable();
        }
    }, onFinish);
}
main();
async function runTest(stream) {
    const key = stream.getUniqKey();
    results[key] = chalk_1.default.white('LOADING...');
    const result = await tester.test(stream);
    let status = '';
    const errorStatusCodes = ['ENOTFOUND', 'HTTP_404_NOT_FOUND'];
    if (result.status.ok)
        status = chalk_1.default.green('OK');
    else if (errorStatusCodes.includes(result.status.code)) {
        status = chalk_1.default.red(result.status.code);
        errors++;
    }
    else {
        status = chalk_1.default.yellow(result.status.code);
        warnings++;
    }
    results[key] = status;
}
function drawTable() {
    process.stdout.write('\u001b[3J\u001b[1J');
    console.clear();
    const streamsGrouped = streams.groupBy((stream) => stream.filepath);
    for (const filepath of streamsGrouped.keys()) {
        const streams = streamsGrouped.get(filepath) || [];
        const table = new core_1.CliTable({
            columns: [
                { name: '', alignment: 'center', minLen: 3, maxLen: 3 },
                { name: 'tvg-id', alignment: 'left', color: 'green', minLen: 25, maxLen: 25 },
                { name: 'url', alignment: 'left', color: 'green', minLen: 100, maxLen: 100 },
                { name: 'status', alignment: 'left', minLen: 25, maxLen: 25 }
            ]
        });
        streams.forEach((stream, index) => {
            const key = stream.getUniqKey();
            const status = results[key] || chalk_1.default.gray('PENDING');
            const tvgId = stream.getTvgId();
            const row = {
                '': index,
                'tvg-id': (0, utils_1.truncate)(tvgId, 25),
                url: (0, utils_1.truncate)(stream.url, 100),
                status
            };
            table.append(row);
        });
        process.stdout.write(`\n${chalk_1.default.underline(filepath)}\n`);
        process.stdout.write(table.toString());
    }
}
function onFinish(error) {
    clearInterval(interval);
    if (error) {
        console.error(error);
        process.exit(1);
    }
    drawTable();
    if (errors > 0 || warnings > 0) {
        console.log(chalk_1.default.red(`\n${errors + warnings} problems (${errors} errors, ${warnings} warnings)`));
        if (errors > 0) {
            process.exit(1);
        }
    }
    process.exit(0);
}
async function isOffline() {
    return new Promise((resolve, reject) => {
        node_dns_1.default.lookup('info.cern.ch', err => {
            if (err)
                resolve(true);
            reject(false);
        });
    }).catch(() => { });
}
