"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueLoader = void 0;
const plugin_rest_endpoint_methods_1 = require("@octokit/plugin-rest-endpoint-methods");
const plugin_paginate_rest_1 = require("@octokit/plugin-paginate-rest");
const constants_1 = require("../constants");
const core_1 = require("@freearhey/core");
const core_2 = require("@octokit/core");
const _1 = require("./");
const CustomOctokit = core_2.Octokit.plugin(plugin_paginate_rest_1.paginateRest, plugin_rest_endpoint_methods_1.restEndpointMethods);
const octokit = new CustomOctokit();
class IssueLoader {
    async load(props) {
        let labels = '';
        if (props && props.labels) {
            labels = Array.isArray(props.labels) ? props.labels.join(',') : props.labels;
        }
        let issues = [];
        if (constants_1.TESTING) {
            issues = (await import('../../tests/__data__/input/issues.js')).default;
        }
        else {
            issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
                owner: constants_1.OWNER,
                repo: constants_1.REPO,
                per_page: 100,
                labels,
                status: 'open',
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
        }
        const parser = new _1.IssueParser();
        return new core_1.Collection(issues).map(parser.parse);
    }
}
exports.IssueLoader = IssueLoader;
