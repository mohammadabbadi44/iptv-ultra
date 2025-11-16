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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stream = void 0;
const core_1 = require("@freearhey/core");
const utils_1 = require("../utils");
const sdk = __importStar(require("@iptv-org/sdk"));
const api_1 = require("../api");
const node_path_1 = __importDefault(require("node:path"));
class Stream extends sdk.Models.Stream {
    constructor() {
        super(...arguments);
        this.groupTitle = 'Undefined';
        this.removed = false;
    }
    updateWithIssue(issueData) {
        const data = {
            label: issueData.getString('label'),
            quality: issueData.getString('quality'),
            httpUserAgent: issueData.getString('httpUserAgent'),
            httpReferrer: issueData.getString('httpReferrer'),
            newStreamUrl: issueData.getString('newStreamUrl'),
            directives: issueData.getArray('directives')
        };
        if (data.label !== undefined)
            this.label = data.label;
        if (data.quality !== undefined)
            this.quality = data.quality;
        if (data.httpUserAgent !== undefined)
            this.user_agent = data.httpUserAgent;
        if (data.httpReferrer !== undefined)
            this.referrer = data.httpReferrer;
        if (data.newStreamUrl !== undefined)
            this.url = data.newStreamUrl;
        if (data.directives !== undefined)
            this.setDirectives(data.directives);
        return this;
    }
    static fromPlaylistItem(data) {
        function escapeRegExp(text) {
            return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        }
        function parseName(name) {
            let title = name;
            const [, label] = title.match(/ \[(.*)\]$/) || [null, ''];
            title = title.replace(new RegExp(` \\[${escapeRegExp(label)}\\]$`), '');
            const [, quality] = title.match(/ \(([0-9]+[p|i])\)$/) || [null, ''];
            title = title.replace(new RegExp(` \\(${quality}\\)$`), '');
            return { title, label, quality };
        }
        function parseDirectives(string) {
            const directives = new core_1.Collection();
            if (!string)
                return directives;
            const supportedDirectives = ['#EXTVLCOPT', '#KODIPROP'];
            const lines = string.split('\r\n');
            const regex = new RegExp(`^${supportedDirectives.join('|')}`, 'i');
            lines.forEach((line) => {
                if (regex.test(line)) {
                    directives.add(line.trim());
                }
            });
            return directives;
        }
        if (!data.name)
            throw new Error('"name" property is required');
        if (!data.url)
            throw new Error('"url" property is required');
        const [channelId, feedId] = data.tvg.id.split('@');
        const { title, label, quality } = parseName(data.name);
        const stream = new Stream({
            channel: channelId || null,
            feed: feedId || null,
            title: title,
            quality: quality || null,
            url: data.url,
            referrer: data.http.referrer || null,
            user_agent: data.http['user-agent'] || null
        });
        stream.tvgId = data.tvg.id;
        stream.line = data.line;
        stream.label = label || null;
        stream.directives = parseDirectives(data.raw);
        return stream;
    }
    isSFW() {
        const channel = this.getChannel();
        if (!channel)
            return true;
        return !channel.is_nsfw;
    }
    getUniqKey() {
        const filepath = this.getFilepath();
        const tvgId = this.getTvgId();
        return filepath + tvgId + this.url;
    }
    getVerticalResolution() {
        if (!this.quality)
            return 0;
        const [, verticalResolutionString] = this.quality.match(/^(\d+)/) || ['', '0'];
        return parseInt(verticalResolutionString);
    }
    getBroadcastCountries() {
        const countries = new core_1.Collection();
        const feed = this.getFeed();
        if (!feed)
            return countries;
        feed
            .getBroadcastArea()
            .getLocations()
            .forEach((location) => {
            let country;
            switch (location.type) {
                case 'country': {
                    country = api_1.data.countriesKeyByCode.get(location.code);
                    break;
                }
                case 'subdivision': {
                    const subdivision = api_1.data.subdivisionsKeyByCode.get(location.code);
                    if (!subdivision)
                        break;
                    country = api_1.data.countriesKeyByCode.get(subdivision.country);
                    break;
                }
                case 'city': {
                    const city = api_1.data.citiesKeyByCode.get(location.code);
                    if (!city)
                        break;
                    country = api_1.data.countriesKeyByCode.get(city.country);
                    break;
                }
            }
            if (country)
                countries.add(country);
        });
        return countries.uniqBy((country) => country.code);
    }
    getBroadcastSubdivisions() {
        const subdivisions = new core_1.Collection();
        const feed = this.getFeed();
        if (!feed)
            return subdivisions;
        feed
            .getBroadcastArea()
            .getLocations()
            .forEach((location) => {
            switch (location.type) {
                case 'subdivision': {
                    const subdivision = api_1.data.subdivisionsKeyByCode.get(location.code);
                    if (!subdivision)
                        break;
                    subdivisions.add(subdivision);
                    if (!subdivision.parent)
                        break;
                    const parentSubdivision = api_1.data.subdivisionsKeyByCode.get(subdivision.parent);
                    if (!parentSubdivision)
                        break;
                    subdivisions.add(parentSubdivision);
                    break;
                }
                case 'city': {
                    const city = api_1.data.citiesKeyByCode.get(location.code);
                    if (!city || !city.subdivision)
                        break;
                    const subdivision = api_1.data.subdivisionsKeyByCode.get(city.subdivision);
                    if (!subdivision)
                        break;
                    subdivisions.add(subdivision);
                    if (!subdivision.parent)
                        break;
                    const parentSubdivision = api_1.data.subdivisionsKeyByCode.get(subdivision.parent);
                    if (!parentSubdivision)
                        break;
                    subdivisions.add(parentSubdivision);
                    break;
                }
            }
        });
        return subdivisions.uniqBy((subdivision) => subdivision.code);
    }
    getBroadcastCities() {
        const cities = new core_1.Collection();
        const feed = this.getFeed();
        if (!feed)
            return cities;
        feed
            .getBroadcastArea()
            .getLocations()
            .forEach((location) => {
            if (location.type !== 'city')
                return;
            const city = api_1.data.citiesKeyByCode.get(location.code);
            if (city)
                cities.add(city);
        });
        return cities.uniqBy((city) => city.code);
    }
    getBroadcastRegions() {
        const regions = new core_1.Collection();
        const feed = this.getFeed();
        if (!feed)
            return regions;
        feed
            .getBroadcastArea()
            .getLocations()
            .forEach((location) => {
            switch (location.type) {
                case 'region': {
                    const region = api_1.data.regionsKeyByCode.get(location.code);
                    if (!region)
                        break;
                    regions.add(region);
                    const relatedRegions = api_1.data.regions.filter((_region) => new core_1.Collection(_region.countries)
                        .intersects(new core_1.Collection(region.countries))
                        .isNotEmpty());
                    regions.concat(relatedRegions);
                    break;
                }
                case 'country': {
                    const country = api_1.data.countriesKeyByCode.get(location.code);
                    if (!country)
                        break;
                    const countryRegions = api_1.data.regions.filter((_region) => new core_1.Collection(_region.countries).includes((code) => code === country.code));
                    regions.concat(countryRegions);
                    break;
                }
                case 'subdivision': {
                    const subdivision = api_1.data.subdivisionsKeyByCode.get(location.code);
                    if (!subdivision)
                        break;
                    const subdivisionRegions = api_1.data.regions.filter((_region) => new core_1.Collection(_region.countries).includes((code) => code === subdivision.country));
                    regions.concat(subdivisionRegions);
                    break;
                }
                case 'city': {
                    const city = api_1.data.citiesKeyByCode.get(location.code);
                    if (!city)
                        break;
                    const cityRegions = api_1.data.regions.filter((_region) => new core_1.Collection(_region.countries).includes((code) => code === city.country));
                    regions.concat(cityRegions);
                    break;
                }
            }
        });
        return regions.uniqBy((region) => region.code);
    }
    isInternational() {
        const feed = this.getFeed();
        if (!feed)
            return false;
        const broadcastAreaCodes = feed.getBroadcastArea().codes;
        if (broadcastAreaCodes.join(';').includes('r/'))
            return true;
        if (broadcastAreaCodes.filter(code => code.includes('c/')).length > 1)
            return true;
        return false;
    }
    hasCategory(category) {
        const channel = this.getChannel();
        if (!channel)
            return false;
        const found = channel.categories.find((id) => id === category.id);
        return !!found;
    }
    hasLanguage(language) {
        const found = this.getLanguages().find((_language) => _language.code === language.code);
        return !!found;
    }
    setDirectives(directives) {
        this.directives = new core_1.Collection(directives).filter((directive) => /^(#KODIPROP|#EXTVLCOPT)/.test(directive));
        return this;
    }
    updateTvgId() {
        if (!this.channel)
            return this;
        if (this.feed) {
            this.tvgId = `${this.channel}@${this.feed}`;
        }
        else {
            this.tvgId = this.channel;
        }
        return this;
    }
    updateFilepath() {
        const channel = this.getChannel();
        if (!channel)
            return this;
        this.filepath = `${channel.country.toLowerCase()}.m3u`;
        return this;
    }
    updateTitle() {
        const channel = this.getChannel();
        if (!channel)
            return this;
        const feed = this.getFeed();
        this.title = channel.name;
        if (feed && !feed.is_main) {
            this.title += ` ${feed.name}`;
        }
        return this;
    }
    normalizeURL() {
        this.url = (0, utils_1.normalizeURL)(this.url);
    }
    getLogos() {
        const logos = super.getLogos();
        if (logos.isEmpty())
            return new core_1.Collection();
        function format(logo) {
            const levelByFormat = { SVG: 0, PNG: 3, APNG: 1, WebP: 1, AVIF: 1, JPEG: 2, GIF: 1 };
            return logo.format ? levelByFormat[logo.format] : 0;
        }
        function size(logo) {
            return Math.abs(512 - logo.width) + Math.abs(512 - logo.height);
        }
        return logos.sortBy([format, size], ['desc', 'asc'], false);
    }
    getFilepath() {
        return this.filepath || '';
    }
    getFilename() {
        return node_path_1.default.basename(this.getFilepath());
    }
    getLine() {
        return this.line || -1;
    }
    getTvgId() {
        if (this.tvgId)
            return this.tvgId;
        return this.getId();
    }
    getTvgLogo() {
        const logo = this.getLogos().first();
        return logo ? logo.url : '';
    }
    getFullTitle() {
        let title = `${this.title}`;
        if (this.quality) {
            title += ` (${this.quality})`;
        }
        if (this.label) {
            title += ` [${this.label}]`;
        }
        return title;
    }
    toString(options = {}) {
        options = Object.assign({ public: false }, options);
        let output = `#EXTINF:-1 tvg-id="${this.getTvgId()}"`;
        if (options.public) {
            output += ` tvg-logo="${this.getTvgLogo()}" group-title="${this.groupTitle}"`;
        }
        if (this.referrer) {
            output += ` http-referrer="${this.referrer}"`;
        }
        if (this.user_agent) {
            output += ` http-user-agent="${this.user_agent}"`;
        }
        output += `,${this.getFullTitle()}`;
        this.directives.forEach((prop) => {
            output += `\r\n${prop}`;
        });
        output += `\r\n${this.url}`;
        return output;
    }
    toObject() {
        let feedId = this.feed;
        if (!feedId) {
            const feed = this.getFeed();
            if (feed)
                feedId = feed.id;
        }
        return {
            channel: this.channel,
            feed: feedId,
            title: this.title,
            url: this.url,
            quality: this.quality,
            user_agent: this.user_agent,
            referrer: this.referrer
        };
    }
    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
}
exports.Stream = Stream;
