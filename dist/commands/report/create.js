"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@freearhey/core");
const core_2 = require("../../core");
const storage_js_1 = require("@freearhey/storage-js");
const utils_1 = require("../../utils");
const constants_1 = require("../../constants");
const api_1 = require("../../api");
const status = {
    PENDING: 'pending',
    FULFILLED: 'fulfilled',
    MISSING_CHANNEL_ID: 'missing_channel_id',
    INVALID_CHANNEL_ID: 'invalid_channel_id',
    MISSING_STREAM_URL: 'missing_stream_url',
    INVALID_STREAM_URL: 'invalid_stream_url',
    NONEXISTENT_LINK: 'nonexistent_link',
    CHANNEL_BLOCKED: 'channel_blocked',
    CHANNEL_CLOSED: 'channel_closed',
    DUPLICATE_LINK: 'duplicate_link',
    DUPLICATE_REQUEST: 'duplicate_request'
};
async function main() {
    const logger = new core_1.Logger();
    const issueLoader = new core_2.IssueLoader();
    let report = new core_1.Collection();
    logger.info('loading issues...');
    const issues = await issueLoader.load();
    logger.info('loading data from api...');
    await (0, api_1.loadData)();
    logger.info('loading streams...');
    const streamsStorage = new storage_js_1.Storage(constants_1.STREAMS_DIR);
    const parser = new core_2.PlaylistParser({
        storage: streamsStorage
    });
    const files = await streamsStorage.list('**/*.m3u');
    const streams = await parser.parse(files);
    const streamsGroupedByUrl = streams.groupBy((stream) => stream.url);
    const streamsGroupedByChannel = streams.groupBy((stream) => stream.channel);
    const streamsGroupedById = streams.groupBy((stream) => stream.getId());
    logger.info('checking streams:remove requests...');
    const removeRequests = issues.filter(issue => issue.labels.find((label) => label === 'streams:remove'));
    removeRequests.forEach((issue) => {
        const streamUrls = issue.data.getArray('streamUrl') || [];
        if (!streamUrls.length) {
            const result = {
                issueNumber: issue.number,
                type: 'streams:remove',
                streamId: undefined,
                streamUrl: undefined,
                status: status.NONEXISTENT_LINK
            };
            report.add(result);
        }
        else {
            for (const streamUrl of streamUrls) {
                const result = {
                    issueNumber: issue.number,
                    type: 'streams:remove',
                    streamId: undefined,
                    streamUrl: (0, utils_1.truncate)(streamUrl),
                    status: status.PENDING
                };
                if (streamsGroupedByUrl.missing(streamUrl)) {
                    result.status = status.NONEXISTENT_LINK;
                }
                report.add(result);
            }
        }
    });
    logger.info('checking streams:add requests...');
    const addRequests = issues.filter(issue => issue.labels.includes('streams:add'));
    const addRequestsBuffer = new core_1.Dictionary();
    addRequests.forEach((issue) => {
        const streamId = issue.data.getString('streamId') || '';
        const streamUrl = issue.data.getString('streamUrl') || '';
        const [channelId] = streamId.split('@');
        const result = {
            issueNumber: issue.number,
            type: 'streams:add',
            streamId: streamId || undefined,
            streamUrl: (0, utils_1.truncate)(streamUrl),
            status: status.PENDING
        };
        if (!channelId)
            result.status = status.MISSING_CHANNEL_ID;
        else if (!streamUrl)
            result.status = status.MISSING_STREAM_URL;
        else if (!(0, utils_1.isURI)(streamUrl))
            result.status = status.INVALID_STREAM_URL;
        else if (api_1.data.blocklistRecordsGroupedByChannel.has(channelId))
            result.status = status.CHANNEL_BLOCKED;
        else if (api_1.data.channelsKeyById.missing(channelId))
            result.status = status.INVALID_CHANNEL_ID;
        else if (streamsGroupedByUrl.has(streamUrl))
            result.status = status.DUPLICATE_LINK;
        else if (addRequestsBuffer.has(streamUrl))
            result.status = status.DUPLICATE_REQUEST;
        else
            result.status = status.PENDING;
        addRequestsBuffer.set(streamUrl, true);
        report.add(result);
    });
    logger.info('checking streams:edit requests...');
    const editRequests = issues.filter(issue => issue.labels.find((label) => label === 'streams:edit'));
    editRequests.forEach((issue) => {
        const streamId = issue.data.getString('streamId') || '';
        const streamUrl = issue.data.getString('streamUrl') || '';
        const [channelId] = streamId.split('@');
        const result = {
            issueNumber: issue.number,
            type: 'streams:edit',
            streamId: streamId || undefined,
            streamUrl: (0, utils_1.truncate)(streamUrl),
            status: status.PENDING
        };
        if (!streamUrl)
            result.status = status.MISSING_STREAM_URL;
        else if (streamsGroupedByUrl.missing(streamUrl))
            result.status = status.NONEXISTENT_LINK;
        else if (channelId && api_1.data.channelsKeyById.missing(channelId))
            result.status = status.INVALID_CHANNEL_ID;
        report.add(result);
    });
    logger.info('checking channel search requests...');
    const channelSearchRequests = issues.filter(issue => issue.labels.find((label) => label === 'channel search'));
    const channelSearchRequestsBuffer = new core_1.Dictionary();
    channelSearchRequests.forEach((issue) => {
        const streamId = issue.data.getString('streamId') || issue.data.getString('channelId') || '';
        const [channelId, feedId] = streamId.split('@');
        const result = {
            issueNumber: issue.number,
            type: 'channel search',
            streamId: streamId || undefined,
            streamUrl: undefined,
            status: status.PENDING
        };
        if (!channelId)
            result.status = status.MISSING_CHANNEL_ID;
        else if (api_1.data.channelsKeyById.missing(channelId))
            result.status = status.INVALID_CHANNEL_ID;
        else if (channelSearchRequestsBuffer.has(streamId))
            result.status = status.DUPLICATE_REQUEST;
        else if (api_1.data.blocklistRecordsGroupedByChannel.has(channelId))
            result.status = status.CHANNEL_BLOCKED;
        else if (streamsGroupedById.has(streamId))
            result.status = status.FULFILLED;
        else if (!feedId && streamsGroupedByChannel.has(channelId))
            result.status = status.FULFILLED;
        else {
            const channelData = api_1.data.channelsKeyById.get(channelId);
            if (channelData && channelData.isClosed())
                result.status = status.CHANNEL_CLOSED;
        }
        channelSearchRequestsBuffer.set(streamId, true);
        report.add(result);
    });
    report = report.sortBy(item => item.issueNumber).filter(item => item.status !== status.PENDING);
    console.table(report.all());
}
main();
