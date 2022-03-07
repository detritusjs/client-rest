"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestRequest = void 0;
const url_1 = require("url");
const constants_1 = require("detritus-rest/lib/constants");
const detritus_utils_1 = require("detritus-utils");
const bucket_1 = require("./bucket");
const constants_2 = require("./constants");
const endpoints_1 = require("./endpoints");
const errors_1 = require("./errors");
class RestRequest {
    bucketPath;
    _bucketHash;
    _bucketKey;
    client;
    errorOnRatelimit;
    errorOnRatelimitIfMoreThan;
    maxRetries;
    request;
    retries;
    retryDelay;
    skipRatelimitCheck;
    constructor(client, request, options = {}) {
        this.client = client;
        this.request = request;
        if (this.shouldRatelimitCheck) {
            if (client.isBot) {
                request.headers.set(constants_2.RatelimitHeaders.PRECISION, constants_2.RatelimitPrecisionTypes.MILLISECOND);
            }
            if (request.route) {
                this.bucketPath = `${request.route.method}-${request.route.path}`;
                if (request.route.method === constants_1.HTTPMethods.DELETE && request.route.path === endpoints_1.Api.CHANNEL_MESSAGE) {
                    if ('messageId' in request.route.params) {
                        const difference = Date.now() - detritus_utils_1.Snowflake.timestamp(request.route.params.messageId);
                        if (constants_2.MESSAGE_DELETE_RATELIMIT_CHECK_OLDER <= difference) {
                            this.bucketPath = `${this.bucketPath}.${constants_2.MESSAGE_DELETE_RATELIMIT_CHECK_OLDER}`;
                        }
                        else if (constants_2.MESSAGE_DELETE_RATELIMIT_CHECK <= difference) {
                            this.bucketPath = `${this.bucketPath}.${constants_2.MESSAGE_DELETE_RATELIMIT_CHECK}`;
                        }
                    }
                }
                else if (request.route.method === constants_1.HTTPMethods.PATCH && request.route.path === endpoints_1.Api.CHANNEL) {
                    // add custom bucketPaths for editing {name} and {topic}
                    // https://github.com/discord/discord-api-docs/issues/2190
                }
            }
        }
        this.errorOnRatelimit = options.errorOnRatelimit;
        this.errorOnRatelimitIfMoreThan = options.errorOnRatelimitIfMoreThan;
        this.maxRetries = 5;
        this.retries = 0;
        this.retryDelay = 2000;
        this.skipRatelimitCheck = options.skipRatelimitCheck;
    }
    get bucket() {
        if (this.bucketKey) {
            return this.client.buckets.get(this.bucketKey) || null;
        }
        return null;
    }
    get bucketHash() {
        if (this._bucketHash) {
            return this._bucketHash;
        }
        if (!this.skipRatelimitCheck && this.request.route && this.shouldRatelimitCheck) {
            const path = this.bucketPath;
            if (this.client.isBot) {
                if (this.client.routes.has(path)) {
                    return this._bucketHash = this.client.routes.get(path);
                }
            }
            else {
                return this._bucketHash = path;
            }
        }
        return null;
    }
    get bucketKey() {
        if (this._bucketKey) {
            return this._bucketKey;
        }
        if (this.request.route) {
            const bucketHash = this.bucketHash;
            if (bucketHash) {
                let major = '';
                for (let param of constants_2.RATELIMIT_BUCKET_MAJOR_PARAMS) {
                    if (param in this.request.route.params) {
                        major += this.request.route.params[param].trim();
                    }
                    major += '-';
                }
                return this._bucketKey = `${bucketHash}.${major.slice(0, -1)}`;
            }
        }
        return null;
    }
    get shouldRatelimitCheck() {
        return ((this.client.restClient.baseUrl instanceof url_1.URL) &&
            (this.client.restClient.baseUrl.host === this.request.parsedUrl.host));
    }
    sendRequest() {
        return new Promise((resolve, reject) => {
            if (this.shouldRatelimitCheck && !this.errorOnRatelimit) {
                if (this.client.globalBucket.locked) {
                    return this.client.globalBucket.add({ request: this, resolve, reject });
                }
                const bucket = this.bucket;
                if (bucket) {
                    if (bucket.locked) {
                        return bucket.add({ request: this, resolve, reject });
                    }
                    if (bucket.ratelimit.remaining === 1) {
                        const ratelimit = bucket.ratelimit;
                        const diff = Math.min(0, ratelimit.resetAtLocal - Date.now());
                        if (diff && (!this.errorOnRatelimitIfMoreThan || diff <= this.errorOnRatelimitIfMoreThan)) {
                            bucket.lock(diff);
                        }
                    }
                }
            }
            resolve(this.request.send());
        });
    }
    async send() {
        const response = await this.sendRequest();
        this.client.emit(constants_2.RestEvents.RESPONSE, { response, restRequest: this });
        if (this.shouldRatelimitCheck) {
            let bucket = null;
            if (this.request.route) {
                // reason for this check is just incase the request doesnt have one and we will still check the global ratelimit
                let shouldHaveBucket = false;
                if (this.client.isBot) {
                    if (response.headers.has(constants_2.RatelimitHeaders.BUCKET) && this.bucketPath) {
                        this.client.routes.set(this.bucketPath, response.headers.get(constants_2.RatelimitHeaders.BUCKET));
                        shouldHaveBucket = true;
                    }
                    else {
                        // no ratelimit on this path
                    }
                }
                else {
                    // users dont get the above header
                    shouldHaveBucket = true;
                }
                if (shouldHaveBucket && !this.skipRatelimitCheck) {
                    bucket = this.bucket;
                    if (!bucket) {
                        bucket = new bucket_1.Bucket(this.bucketKey);
                        this.client.buckets.insert(bucket);
                    }
                }
            }
            if (bucket) {
                if (response.headers.has(constants_2.RatelimitHeaders.LIMIT)) {
                    bucket.setRatelimit(parseInt(response.headers.get(constants_2.RatelimitHeaders.LIMIT) || ''), parseInt(response.headers.get(constants_2.RatelimitHeaders.REMAINING) || ''), (parseFloat(response.headers.get(constants_2.RatelimitHeaders.RESET) || '') || 0) * 1000, (parseFloat(response.headers.get(constants_2.RatelimitHeaders.RESET_AFTER) || '') || 0) * 1000);
                }
                const ratelimit = bucket.ratelimit;
                if (ratelimit.remaining <= 0 && response.statusCode !== 429) {
                    const diff = ratelimit.resetAfter;
                    if (diff) {
                        bucket.lock(diff);
                    }
                }
            }
            if (response.statusCode === 429 && !this.errorOnRatelimit) {
                // ratelimited, retry
                let retryAfter = 0;
                if (response.headers.has(constants_2.RatelimitHeaders.RESET_AFTER)) {
                    retryAfter = (parseFloat(response.headers.get(constants_2.RatelimitHeaders.RESET_AFTER) || '') || 0) * 1000;
                }
                else {
                    retryAfter = (parseInt(response.headers.get(constants_2.RatelimitHeaders.RETRY_AFTER) || '') || 0) * 1000;
                }
                if (!this.errorOnRatelimitIfMoreThan || retryAfter <= this.errorOnRatelimitIfMoreThan) {
                    const isDiscordRatelimit = response.headers.has('via');
                    return new Promise(async (resolve, reject) => {
                        const delayed = { request: this, resolve, reject };
                        const data = await response.json();
                        if (this.client.isBot) {
                            if (response.headers.get(constants_2.RatelimitHeaders.GLOBAL) === 'true') {
                                this.client.globalBucket.lock(retryAfter);
                                this.client.globalBucket.add(delayed);
                                return;
                            }
                            // incase they, for some reason, send us a differing body from the headers (happened cuz of channel edits with name/topic)
                            // just error out since this is a fluke
                            if ((data.retry_after * 1000) !== retryAfter) {
                                return reject(new errors_1.HTTPError(response));
                            }
                        }
                        else {
                            if (isDiscordRatelimit) {
                                // check json body since users dont get the above header
                                if (data.global) {
                                    this.client.globalBucket.lock(retryAfter);
                                    this.client.globalBucket.add(delayed);
                                    return;
                                }
                            }
                        }
                        if (bucket) {
                            bucket.ratelimit.remaining = 0;
                            bucket.ratelimit.resetAfter = retryAfter;
                            bucket.lock(retryAfter);
                            bucket.add(delayed, true);
                            return;
                        }
                        // unsure of what to do since we should've gotten global ratelimited
                        return reject(new errors_1.HTTPError(response));
                    });
                }
                if (bucket && bucket.size) {
                    this.client.buckets.resetExpire(bucket);
                }
            }
        }
        if (response.statusCode === 502 && this.maxRetries <= this.retries++) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.request.send().then(resolve).catch(reject);
                }, this.retryDelay);
                return;
            });
        }
        if (!response.ok) {
            let data;
            switch ((response.headers.get(constants_1.HTTPHeaders.CONTENT_TYPE) || '').split(';').shift()) {
                case constants_1.ContentTypes.APPLICATION_JSON:
                    {
                        data = await response.json();
                    }
                    ;
                    break;
                case constants_1.ContentTypes.TEXT_PLAIN:
                    {
                        data = await response.text();
                    }
                    ;
                    break;
                default:
                    {
                        data = await response.buffer();
                        if (!data.length) {
                            data = null;
                        }
                    }
                    ;
            }
            if (data && typeof (data) === 'object' && !Buffer.isBuffer(data)) {
                if ((this.client.restClient.baseUrl instanceof url_1.URL) &&
                    (this.client.restClient.baseUrl.host === this.request.parsedUrl.host)) {
                    throw new errors_1.DiscordHTTPError(response, data);
                }
                else {
                    throw new errors_1.HTTPError(response, data.message, data.code);
                }
            }
            else {
                throw new errors_1.HTTPError(response, data);
            }
        }
        return response;
    }
}
exports.RestRequest = RestRequest;
