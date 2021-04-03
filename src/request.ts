import { URL } from 'url';

import { Request, Response } from 'detritus-rest';
import { ContentTypes, HTTPHeaders, HTTPMethods } from 'detritus-rest/lib/constants';
import { Snowflake } from 'detritus-utils';

import { Bucket } from './bucket';
import { Client } from './client';
import {
  RatelimitHeaders,
  RatelimitPrecisionTypes,
  RestEvents,
  MESSAGE_DELETE_RATELIMIT_CHECK,
  MESSAGE_DELETE_RATELIMIT_CHECK_OLDER,
  RATELIMIT_BUCKET_MAJOR_PARAMS,
} from './constants';
import { Api } from './endpoints';
import { DiscordHTTPError, HTTPError } from './errors';


export interface RestRequestOptions {
  errorOnRatelimit?: boolean,
  skipRatelimitCheck?: boolean,
}

export class RestRequest {
  readonly bucketPath?: string;

  _bucketHash?: string;
  _bucketKey?: string;

  client: Client;
  errorOnRatelimit?: boolean;
  maxRetries: number;
  request: Request;
  retries: number;
  retryDelay: number;
  skipRatelimitCheck?: boolean;

  constructor(
    client: Client,
    request: Request,
    options: RestRequestOptions = {},
  ) {
    this.client = client;
    this.request = request;

    if (this.shouldRatelimitCheck) {
      if (client.isBot) {
        request.headers.set(RatelimitHeaders.PRECISION, RatelimitPrecisionTypes.MILLISECOND);
      }

      if (request.route) {
        this.bucketPath = `${request.route.method}-${request.route.path}`;
        if (request.route.method === HTTPMethods.DELETE && request.route.path === Api.CHANNEL_MESSAGE) {
          if ('messageId' in request.route.params) {
            const difference = Date.now() - Snowflake.timestamp(request.route.params.messageId);
            if (MESSAGE_DELETE_RATELIMIT_CHECK_OLDER <= difference) {
              this.bucketPath = `${this.bucketPath}.${MESSAGE_DELETE_RATELIMIT_CHECK_OLDER}`;
            } else if (MESSAGE_DELETE_RATELIMIT_CHECK <= difference) {
              this.bucketPath = `${this.bucketPath}.${MESSAGE_DELETE_RATELIMIT_CHECK}`;
            }
          }
        } else if (request.route.method === HTTPMethods.PATCH && request.route.path === Api.CHANNEL) {
          // add custom bucketPaths for editing {name} and {topic}
          // https://github.com/discord/discord-api-docs/issues/2190
        }
      }
    }

    this.errorOnRatelimit = options.errorOnRatelimit;
    this.maxRetries = 5;
    this.retries = 0;
    this.retryDelay = 2000;
    this.skipRatelimitCheck = options.skipRatelimitCheck;
  }

  get bucket(): Bucket | null {
    if (this.bucketKey) {
      return this.client.buckets.get(this.bucketKey) || null;
    }
    return null;
  }

  get bucketHash(): null | string {
    if (this._bucketHash) {
      return this._bucketHash;
    }
    if (!this.skipRatelimitCheck && this.request.route && this.shouldRatelimitCheck) {
      const path = this.bucketPath as string;
      if (this.client.isBot) {
        if (this.client.routes.has(path)) {
          return this._bucketHash = this.client.routes.get(path) as string;
        }
      } else {
        return this._bucketHash = path;
      }
    }
    return null;
  }

  get bucketKey(): null | string {
    if (this._bucketKey) {
      return this._bucketKey;
    }
    if (this.request.route) {
      const bucketHash = this.bucketHash;
      if (bucketHash) {
        let major = '';
        for (let param of RATELIMIT_BUCKET_MAJOR_PARAMS) {
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

  get shouldRatelimitCheck(): boolean {
    return (
      (this.client.restClient.baseUrl instanceof URL) &&
      (this.client.restClient.baseUrl.host === this.request.parsedUrl.host)
    );
  }

  sendRequest(): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (this.shouldRatelimitCheck && !this.errorOnRatelimit) {
        if (this.client.globalBucket.locked) {
          return this.client.globalBucket.add({request: this, resolve, reject});
        }

        const bucket = this.bucket;
        if (bucket) {
          if (bucket.locked) {
            return bucket.add({request: this, resolve, reject});
          }
          if (bucket.ratelimit.remaining === 1) {
            const ratelimit = bucket.ratelimit;
            const diff = Math.min(0, ratelimit.resetAtLocal - Date.now());
            if (diff) {
              bucket.lock(diff);
            }
          }
        }
      }
      resolve(this.request.send());
    });
  }

  async send(): Promise<Response> {
    const response = await this.sendRequest();
    this.client.emit(RestEvents.RESPONSE, {response, restRequest: this});

    if (this.shouldRatelimitCheck) {
      let bucket: Bucket | null = null;

      if (this.request.route) {
        // reason for this check is just incase the request doesnt have one and we will still check the global ratelimit

        let shouldHaveBucket: boolean = false;
        if (this.client.isBot) {
          if (response.headers.has(RatelimitHeaders.BUCKET) && this.bucketPath) {
            this.client.routes.set(this.bucketPath, response.headers.get(RatelimitHeaders.BUCKET) as string);
            shouldHaveBucket = true;
          } else {
            // no ratelimit on this path
          }
        } else {
          // users dont get the above header
          shouldHaveBucket = true;
        }

        if (shouldHaveBucket && !this.skipRatelimitCheck) {
          bucket = this.bucket;
          if (!bucket) {
            bucket = new Bucket(this.bucketKey as string);
            this.client.buckets.insert(bucket);
          }
        }
      }

      if (bucket) {
        if (response.headers.has(RatelimitHeaders.LIMIT)) {
          bucket.setRatelimit(
            parseInt(response.headers.get(RatelimitHeaders.LIMIT) || ''),
            parseInt(response.headers.get(RatelimitHeaders.REMAINING) || ''),
            (parseFloat(response.headers.get(RatelimitHeaders.RESET) || '') || 0) * 1000,
            (parseFloat(response.headers.get(RatelimitHeaders.RESET_AFTER) || '') || 0) * 1000,
          );
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
        if (response.headers.has(RatelimitHeaders.RESET_AFTER)) {
          retryAfter = (parseFloat(response.headers.get(RatelimitHeaders.RESET_AFTER) || '') || 0) * 1000;
        } else {
          retryAfter = (parseInt(response.headers.get(RatelimitHeaders.RETRY_AFTER) || '') || 0) * 1000;
        }

        const isDiscordRatelimit = response.headers.has('via');
        return new Promise(async (resolve, reject) => {
          const delayed = {request: this, resolve, reject};

          const data = await response.json() as {global: boolean, retry_after: number};
          if (this.client.isBot) {
            // incase they, for some reason, send us a differing body from the headers (happened cuz of channel edits with name/topic)
            // just error out since this is a fluke
            if ((data.retry_after * 1000) !== retryAfter) {
              return reject(new HTTPError(response));
            }

            if (response.headers.get(RatelimitHeaders.GLOBAL) === 'true') {
              this.client.globalBucket.lock(retryAfter);
              this.client.globalBucket.add(delayed);
              return;
            }
          } else {
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
          return reject(new HTTPError(response));
        });
      }

      if (bucket && bucket.size) {
        this.client.buckets.resetExpire(bucket);
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
      let data: any;
      switch ((response.headers.get(HTTPHeaders.CONTENT_TYPE) || '').split(';').shift()) {
        case ContentTypes.APPLICATION_JSON: {
          data = await response.json();
        }; break;
        case ContentTypes.TEXT_PLAIN: {
          data = await response.text();
        }; break;
        default: {
          data = await response.buffer();
          if (!data.length) {
            data = null;
          }
        };
      }
      if (data && typeof(data) === 'object' && !Buffer.isBuffer(data)) {
        if (
          (this.client.restClient.baseUrl instanceof URL) &&
          (this.client.restClient.baseUrl.host === this.request.parsedUrl.host)
        ) {
          throw new DiscordHTTPError(response, data);
        } else {
          throw new HTTPError(response, data.message, data.code);
        }
      } else {
        throw new HTTPError(response, data);
      }
    }
    return response;
  }
}
