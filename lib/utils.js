"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spoilerfy = void 0;
const constants_1 = require("./constants");
function spoilerfy(file) {
    if (file.filename && !file.filename.startsWith(constants_1.SPOILER_ATTACHMENT_PREFIX)) {
        file.filename = `${constants_1.SPOILER_ATTACHMENT_PREFIX}${file.filename}`;
    }
    return file;
}
exports.spoilerfy = spoilerfy;
