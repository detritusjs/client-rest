"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyData = exports.bufferToBase64 = exports.Regexes = exports.Types = void 0;
var Types;
(function (Types) {
    Types["ARRAY"] = "array";
    Types["BOOLEAN"] = "boolean";
    Types["NUMBER"] = "number";
    Types["OBJECT"] = "object";
    Types["SNOWFLAKE"] = "snowflake";
    Types["STRING"] = "string";
})(Types = exports.Types || (exports.Types = {}));
exports.Regexes = {
    [Types.SNOWFLAKE]: /^\d+|@me$/,
};
function bufferToBase64(buffer) {
    if (buffer instanceof Buffer) {
        const mimetype = 'image/png';
        // just put image/png for now, discord checks the file for the mimetype anyways
        return `data:${mimetype};base64,${buffer.toString('base64')}`;
    }
    return buffer;
}
exports.bufferToBase64 = bufferToBase64;
function verifyData(data, verification) {
    for (let key in verification) {
        const valueOptions = verification[key];
        if (!(key in data) || data[key] === undefined) {
            if (valueOptions.required) {
                throw new Error(`${key} is required.`);
            }
            continue;
        }
        let value = data[key];
        switch (valueOptions.type) {
            case Types.ARRAY:
                {
                    if (!Array.isArray(value)) {
                        throw new Error(`${key} has to be an array.`);
                    }
                }
                ;
                break;
            case Types.BOOLEAN:
                {
                    value = Boolean(value);
                }
                ;
                break;
            case Types.NUMBER:
                {
                    value = parseInt(value);
                    if (value === NaN) {
                        throw new Error(`${key} has to be an integer.`);
                    }
                }
                ;
                break;
            case Types.OBJECT:
                {
                    if (typeof (value) !== Types.OBJECT) {
                        throw new Error(`${key} has to be an object.`);
                    }
                }
                ;
                break;
            case Types.SNOWFLAKE:
                {
                    if (typeof (value) !== Types.STRING && typeof (value) !== Types.NUMBER) {
                        if (!exports.Regexes[Types.SNOWFLAKE].exec(value)) {
                            throw new Error(`${key} has to be a snowflake.`);
                        }
                    }
                }
                ;
                break;
            case Types.STRING:
                {
                    value = String(value);
                }
                ;
                break;
        }
        data[key] = value;
    }
}
exports.verifyData = verifyData;
