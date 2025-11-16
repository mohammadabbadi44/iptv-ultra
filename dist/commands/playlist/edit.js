"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
const api_1 = require("../../api");
const core_1 = require("@freearhey/core");
const prompts_1 = require("@inquirer/prompts");
const models_1 = require("../../models");
const storage_js_1 = require("@freearhey/storage-js");
const core_2 = require("../../core");
const node_cleanup_1 = __importDefault(require("node-cleanup"));
const utils_1 = require("../../utils");
const commander_1 = require("commander");
const readline_1 = __importDefault(require("readline"));
if (process.platform === 'win32') {
    readline_1.default
        .createInterface({
        input: process.stdin,
        output: process.stdout
    })
        .on('SIGINT', function () {
        process.emit('SIGINT');
    });
}
const program = new commander_1.Command();
program.argument('<filepath>', 'Path to *.channels.xml file to edit').parse(process.argv);
const filepath = program.args[0];
const logger = new core_1.Logger();
const storage = new storage_js_1.Storage();
let parsedStreams = new core_1.Collection();
main(filepath);
(0, node_cleanup_1.default)(() => {
    save(filepath);
});
async function main(filepath) {
    if (!(await storage.exists(filepath))) {
        throw new Error(`File "${filepath}" does not exists`);
    }
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const parser = new core_2.PlaylistParser({
        storage
    });
    parsedStreams = await parser.parseFile(filepath);
    const streamsWithoutId = parsedStreams.filter((stream) => !stream.tvgId);
    logger.info(`found ${parsedStreams.count()} streams (including ${streamsWithoutId.count()} without ID)`);
    logger.info('starting...\n');
    for (const stream of streamsWithoutId.all()) {
        try {
            stream.tvgId = await selectChannel(stream);
        }
        catch (err) {
            logger.info(err.message);
            break;
        }
    }
    streamsWithoutId.forEach((stream) => {
        if (stream.channel === '-') {
            stream.channel = '';
        }
    });
}
async function selectChannel(stream) {
    const query = escapeRegex(stream.title);
    const similarChannels = (0, api_1.searchChannels)(query);
    const url = (0, utils_1.truncate)(stream.url, 50);
    const selected = await (0, prompts_1.select)({
        message: `Select channel ID for "${stream.title}" (${url}):`,
        choices: getChannelChoises(similarChannels),
        pageSize: 10
    });
    switch (selected.type) {
        case 'skip':
            return '-';
        case 'type': {
            const typedChannelId = await (0, prompts_1.input)({ message: '  Channel ID:' });
            if (!typedChannelId)
                return '';
            const selectedFeedId = await selectFeed(typedChannelId);
            if (selectedFeedId === '-')
                return typedChannelId;
            return [typedChannelId, selectedFeedId].join('@');
        }
        case 'channel': {
            const selectedChannel = selected.value;
            if (!selectedChannel)
                return '';
            const selectedFeedId = await selectFeed(selectedChannel.id);
            if (selectedFeedId === '-')
                return selectedChannel.id;
            return [selectedChannel.id, selectedFeedId].join('@');
        }
    }
    return '';
}
async function selectFeed(channelId) {
    const channelFeeds = new core_1.Collection(api_1.data.feedsGroupedByChannel.get(channelId));
    const choices = getFeedChoises(channelFeeds);
    const selected = await (0, prompts_1.select)({
        message: `Select feed ID for "${channelId}":`,
        choices,
        pageSize: 10
    });
    switch (selected.type) {
        case 'skip':
            return '-';
        case 'type':
            return await (0, prompts_1.input)({ message: '  Feed ID:', default: 'SD' });
        case 'feed':
            const selectedFeed = selected.value;
            if (!selectedFeed)
                return '';
            return selectedFeed.id;
    }
    return '';
}
function getChannelChoises(channels) {
    const choises = [];
    channels.forEach((channel) => {
        const names = new core_1.Collection([channel.name, ...channel.alt_names]).uniq().join(', ');
        choises.push({
            value: {
                type: 'channel',
                value: channel
            },
            name: `${channel.id} (${names})`,
            short: `${channel.id}`
        });
    });
    choises.push({ name: 'Type...', value: { type: 'type' } });
    choises.push({ name: 'Skip', value: { type: 'skip' } });
    return choises;
}
function getFeedChoises(feeds) {
    const choises = [];
    feeds.forEach((feed) => {
        let name = `${feed.id} (${feed.name})`;
        if (feed.is_main)
            name += ' [main]';
        choises.push({
            value: {
                type: 'feed',
                value: feed
            },
            default: feed.is_main,
            name,
            short: feed.id
        });
    });
    choises.push({ name: 'Type...', value: { type: 'type' } });
    choises.push({ name: 'Skip', value: { type: 'skip' } });
    return choises;
}
function save(filepath) {
    if (!storage.existsSync(filepath))
        return;
    const playlist = new models_1.Playlist(parsedStreams);
    storage.saveSync(filepath, playlist.toString());
    logger.info(`\nFile '${filepath}' successfully saved`);
}
function escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}
