"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Playlist = void 0;
class Playlist {
    constructor(streams, options) {
        this.streams = streams;
        this.options = options || { public: false };
    }
    toString() {
        let output = '#EXTM3U\r\n';
        this.streams.forEach((stream) => {
            output += stream.toString(this.options) + '\r\n';
        });
        return output;
    }
}
exports.Playlist = Playlist;
