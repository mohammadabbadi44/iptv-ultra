"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("../../core");
const models_1 = require("../../models");
const api_1 = require("../../api");
const core_2 = require("@freearhey/core");
const storage_js_1 = require("@freearhey/storage-js");
const constants_1 = require("../../constants");
const utils_1 = require("../../utils");
const processedIssues = new core_2.Collection();
async function main() {
    const logger = new core_2.Logger({ level: -999 });
    const issueLoader = new core_1.IssueLoader();
    logger.info('loading issues...');
    const issues = await issueLoader.load();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const streamsStorage = new storage_js_1.Storage(constants_1.STREAMS_DIR);
    const parser = new core_1.PlaylistParser({
        storage: streamsStorage
    });
    const files = await streamsStorage.list('**/*.m3u');
    const streams = await parser.parse(files);
    logger.info('removing streams...');
    await removeStreams({ streams, issues });
    logger.info('edit stream description...');
    await editStreams({
        streams,
        issues
    });
    logger.info('add new streams...');
    await addStreams({
        streams,
        issues
    });
    logger.info('saving...');
    const groupedStreams = streams.groupBy((stream) => stream.getFilepath());
    for (const filepath of groupedStreams.keys()) {
        let streams = new core_2.Collection(groupedStreams.get(filepath));
        streams = streams.filter((stream) => stream.removed === false);
        const playlist = new models_1.Playlist(streams, { public: false });
        await streamsStorage.save(filepath, playlist.toString());
    }
    const output = processedIssues.map(issue_number => `closes #${issue_number}`).join(', ');
    console.log(`OUTPUT=${output}`);
}
main();
async function removeStreams({ streams, issues }) {
    const requests = issues.filter(issue => issue.labels.includes('streams:remove') && issue.labels.includes('approved'));
    requests.forEach((issue) => {
        const data = issue.data;
        if (data.missing('streamUrl'))
            return;
        const streamUrls = data.getString('streamUrl') || '';
        let changed = false;
        streamUrls
            .split(/\r?\n/)
            .filter(Boolean)
            .forEach(link => {
            const found = streams.first((_stream) => _stream.url === link.trim());
            if (found) {
                found.removed = true;
                changed = true;
            }
        });
        if (changed)
            processedIssues.add(issue.number);
    });
}
async function editStreams({ streams, issues }) {
    const requests = issues.filter(issue => issue.labels.includes('streams:edit') && issue.labels.includes('approved'));
    requests.forEach((issue) => {
        const data = issue.data;
        if (data.missing('streamUrl'))
            return;
        const stream = streams.first((_stream) => _stream.url === data.getString('streamUrl'));
        if (!stream)
            return;
        const streamId = data.getString('streamId') || '';
        const [channelId, feedId] = streamId.split('@');
        if (channelId) {
            stream.channel = channelId;
            stream.feed = feedId;
            stream.updateTvgId().updateTitle().updateFilepath();
        }
        stream.updateWithIssue(data);
        processedIssues.add(issue.number);
    });
}
async function addStreams({ streams, issues }) {
    const requests = issues.filter(issue => issue.labels.includes('streams:add') && issue.labels.includes('approved'));
    requests.forEach((issue) => {
        const data = issue.data;
        if (data.missing('streamId') || data.missing('streamUrl'))
            return;
        if (streams.includes((_stream) => _stream.url === data.getString('streamUrl')))
            return;
        const streamUrl = data.getString('streamUrl') || '';
        if (!(0, utils_1.isURI)(streamUrl))
            return;
        const streamId = data.getString('streamId') || '';
        const [channelId, feedId] = streamId.split('@');
        const channel = api_1.data.channelsKeyById.get(channelId);
        if (!channel)
            return;
        const label = data.getString('label') || '';
        const quality = data.getString('quality') || null;
        const httpUserAgent = data.getString('httpUserAgent') || null;
        const httpReferrer = data.getString('httpReferrer') || null;
        const directives = data.getArray('directives') || [];
        const stream = new models_1.Stream({
            channel: channelId,
            feed: feedId,
            title: channel.name,
            url: streamUrl,
            user_agent: httpUserAgent,
            referrer: httpReferrer,
            quality
        });
        stream.label = label;
        stream.setDirectives(directives).updateTitle().updateFilepath();
        streams.add(stream);
        processedIssues.add(issue.number);
    });
}
