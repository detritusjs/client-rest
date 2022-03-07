"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordHTTPError = exports.HTTPError = void 0;
class BaseError extends Error {
}
class HTTPError extends BaseError {
    code;
    response;
    constructor(response, message, code) {
        let httpMessage = `HTTP Exception: ${response.statusCode}`;
        if (message) {
            httpMessage += ` (${message})`;
        }
        super(httpMessage);
        this.code = code;
        this.response = response;
    }
}
exports.HTTPError = HTTPError;
class DiscordHTTPError extends HTTPError {
    code;
    errors;
    raw;
    constructor(response, raw) {
        super(response, raw.message, raw.code);
        this.code = raw.code;
        this.errors = raw.errors;
        this.raw = raw;
    }
}
exports.DiscordHTTPError = DiscordHTTPError;
