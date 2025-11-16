"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Markdown = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class Markdown {
    constructor(config) {
        this.build = config.build;
        this.template = config.template;
    }
    compile() {
        const workingDir = process.cwd();
        const templatePath = path_1.default.resolve(workingDir, this.template);
        const template = fs_1.default.readFileSync(templatePath, 'utf8');
        const processedContent = this.processIncludes(template, workingDir);
        if (this.build) {
            const outputPath = path_1.default.resolve(workingDir, this.build);
            fs_1.default.writeFileSync(outputPath, processedContent, 'utf8');
        }
    }
    processIncludes(template, baseDir) {
        const includeRegex = /#include\s+"([^"]+)"/g;
        return template.replace(includeRegex, (match, includePath) => {
            try {
                const fullPath = path_1.default.resolve(baseDir, includePath);
                const includeContent = fs_1.default.readFileSync(fullPath, 'utf8');
                return this.processIncludes(includeContent, baseDir);
            }
            catch (error) {
                console.warn(`Warning: Could not include file ${includePath}: ${error}`);
                return match;
            }
        });
    }
}
exports.Markdown = Markdown;
