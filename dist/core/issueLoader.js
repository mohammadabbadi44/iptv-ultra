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
            issues = (await Promise.resolve().then(() => __importStar(require('../../tests/__data__/input/issues.js')))).default;
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
