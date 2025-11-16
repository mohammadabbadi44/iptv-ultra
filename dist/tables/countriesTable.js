"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountriesTable = void 0;
const constants_1 = require("../constants");
const storage_js_1 = require("@freearhey/storage-js");
const core_1 = require("@freearhey/core");
const core_2 = require("../core");
const api_1 = require("../api");
class CountriesTable {
    async create() {
        const parser = new core_2.LogParser();
        const logsStorage = new storage_js_1.Storage(constants_1.LOGS_DIR);
        const generatorsLog = await logsStorage.load('generators.log');
        const parsed = parser.parse(generatorsLog);
        const logCountries = parsed.filter((logItem) => logItem.type === 'country');
        const logSubdivisions = parsed.filter((logItem) => logItem.type === 'subdivision');
        const logCities = parsed.filter((logItem) => logItem.type === 'city');
        let items = new core_1.Collection();
        api_1.data.countries.forEach((country) => {
            const countryCode = country.code;
            const countriesLogItem = logCountries.find((logItem) => logItem.filepath === `countries/${countryCode.toLowerCase()}.m3u`);
            const countryItem = {
                index: country.name,
                count: 0,
                link: `https://iptv-org.github.io/iptv/countries/${countryCode.toLowerCase()}.m3u`,
                name: `${country.flag} ${country.name}`,
                children: new core_1.Collection()
            };
            if (countriesLogItem) {
                countryItem.count = countriesLogItem.count;
            }
            const countrySubdivisions = api_1.data.subdivisions.filter((subdivision) => subdivision.country === countryCode);
            const countryCities = api_1.data.cities.filter((city) => city.country === countryCode);
            if (countrySubdivisions.isNotEmpty()) {
                api_1.data.subdivisions.forEach((subdivision) => {
                    if (subdivision.country !== countryCode)
                        return;
                    const subdivisionCode = subdivision.code;
                    const subdivisionCities = countryCities.filter((city) => (city.subdivision && city.subdivision === subdivisionCode) ||
                        city.country === subdivision.country);
                    const subdivisionsLogItem = logSubdivisions.find((logItem) => logItem.filepath === `subdivisions/${subdivisionCode.toLowerCase()}.m3u`);
                    const subdivisionItem = {
                        index: subdivision.name,
                        name: subdivision.name,
                        count: 0,
                        link: `https://iptv-org.github.io/iptv/subdivisions/${subdivisionCode.toLowerCase()}.m3u`,
                        children: new core_1.Collection()
                    };
                    if (subdivisionsLogItem) {
                        subdivisionItem.count = subdivisionsLogItem.count;
                    }
                    subdivisionCities.forEach((city) => {
                        if (city.country !== countryCode || city.subdivision !== subdivisionCode)
                            return;
                        const citiesLogItem = logCities.find((logItem) => logItem.filepath === `cities/${city.code.toLowerCase()}.m3u`);
                        if (!citiesLogItem)
                            return;
                        subdivisionItem.children.add({
                            index: city.name,
                            name: city.name,
                            count: citiesLogItem.count,
                            link: `https://iptv-org.github.io/iptv/${citiesLogItem.filepath}`,
                            children: new core_1.Collection()
                        });
                    });
                    if (subdivisionItem.count > 0 || subdivisionItem.children.isNotEmpty()) {
                        countryItem.children.add(subdivisionItem);
                    }
                });
            }
            else if (countryCities.isNotEmpty()) {
                countryCities.forEach((city) => {
                    const citiesLogItem = logCities.find((logItem) => logItem.filepath === `cities/${city.code.toLowerCase()}.m3u`);
                    if (!citiesLogItem)
                        return;
                    countryItem.children.add({
                        index: city.name,
                        name: city.name,
                        count: citiesLogItem.count,
                        link: `https://iptv-org.github.io/iptv/${citiesLogItem.filepath}`,
                        children: new core_1.Collection()
                    });
                });
            }
            if (countryItem.count > 0 || countryItem.children.isNotEmpty()) {
                items.add(countryItem);
            }
        });
        const internationalLogItem = logCountries.find((logItem) => logItem.filepath === 'countries/int.m3u');
        if (internationalLogItem) {
            items.add({
                index: 'ZZ',
                name: '🌐 International',
                count: internationalLogItem.count,
                link: `https://iptv-org.github.io/iptv/${internationalLogItem.filepath}`,
                children: new core_1.Collection()
            });
        }
        const undefinedLogItem = logCountries.find((logItem) => logItem.filepath === 'countries/undefined.m3u');
        if (undefinedLogItem) {
            items.add({
                index: 'ZZZ',
                name: 'Undefined',
                count: undefinedLogItem.count,
                link: `https://iptv-org.github.io/iptv/${undefinedLogItem.filepath}`,
                children: new core_1.Collection()
            });
        }
        items = items.sortBy(item => item.index);
        const output = items
            .map((item) => {
            let row = `- ${item.name} <code>${item.link}</code>`;
            item.children
                .sortBy((item) => item.index)
                .forEach((item) => {
                row += `\r\n  - ${item.name} <code>${item.link}</code>`;
                item.children
                    .sortBy((item) => item.index)
                    .forEach((item) => {
                    row += `\r\n    - ${item.name} <code>${item.link}</code>`;
                });
            });
            return row;
        })
            .join('\r\n');
        const readmeStorage = new storage_js_1.Storage(constants_1.README_DIR);
        await readmeStorage.save('_countries.md', output);
    }
}
exports.CountriesTable = CountriesTable;
