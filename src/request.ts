import { URL } from 'url';

import {
  Request,
  Response,
} from 'detritus-rest';

import { Bucket } from './bucket';
import { Client } from './client';
import {
  RatelimitHeaders,
  RatelimitPrecisionTypes,
  RestEvents,
  RATELIMIT_BUCKET_MAJOR_PARAMS,
} from './constants';
import { DiscordHTTPError, HTTPError } from './errors';


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
    options: {
      errorOnRatelimit?: boolean,
      skipRatelimitCheck?: boolean,
    } = {},
  ) {
    this.client = client;
    this.request = request;

    if (this.shouldRatelimitCheck) {
      if (client.isBot) {
        request.options.headers[RatelimitHeaders.PRECISION] = RatelimitPrecisionTypes.MILLISECOND;
      }

      if (request.route) {
        this.bucketPath = `${request.route.method}-${request.route.path}`;
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
      const path = <string> this.bucketPath;
      if (this.client.isBot) {
        if (this.client.routes.has(path)) {
          return this._bucketHash = <string> this.client.routes.get(path);
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
      (this.client.restClient.baseUrl.host === this.request.url.host)
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
          if (RatelimitHeaders.BUCKET in response.headers) {
            this.client.routes.set(<string> this.bucketPath, response.headers[RatelimitHeaders.BUCKET]);
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
            bucket = new Bucket(<string> this.bucketKey);
            this.client.buckets.insert(bucket);
          }
        }
      }

      if (bucket) {
        if (RatelimitHeaders.LIMIT in response.headers) {
          bucket.setRatelimit(
            parseInt(response.headers[RatelimitHeaders.LIMIT]),
            parseInt(response.headers[RatelimitHeaders.REMAINING]),
            (parseFloat(response.headers[RatelimitHeaders.RESET]) || 0) * 1000,
            (parseFloat(response.headers[RatelimitHeaders.RESET_AFTER]) || 0) * 1000,
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
        let retryAfter = parseInt(response.headers[RatelimitHeaders.RETRY_AFTER]) || 0;

        // since discord's retry-after is in milliseconds (should be seconds, like cloudflare)
        // described here https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
        const isDiscordRatelimit = ('via' in response.headers);
        if (!isDiscordRatelimit) {
          retryAfter *= 1000;
        }
        return new Promise(async (resolve, reject) => {
          const delayed = {request: this, resolve, reject};

          if (this.client.isBot) {
            if (response.headers[RatelimitHeaders.GLOBAL] === 'true') {
              this.client.globalBucket.lock(retryAfter);
              this.client.globalBucket.add(delayed);
              return response.close();
            }
          } else {
            if (isDiscordRatelimit) {
              // check json body since users dont get the above header
              const data = await response.body();
              if (data.global) {
                this.client.globalBucket.lock(retryAfter);
                this.client.globalBucket.add(delayed);
                return response.close();
              }
            }
          }

          if (bucket) {
            bucket.ratelimit.remaining = 0;
            bucket.ratelimit.resetAfter = retryAfter;
            bucket.lock(retryAfter);
            bucket.add(delayed, true);
            return response.close();
          }
          // unsure of what to do since we should've gotten global ratelimited

          await response.buffer();
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
        return response.close();
      });
    }

    const data = await response.body();
    if (!response.ok) {
      if (typeof(data) === 'object' && data !== null) {
        if (
          (this.client.restClient.baseUrl instanceof URL) &&
          (this.client.restClient.baseUrl.host === this.request.url.host)
        ) {
          throw new DiscordHTTPError(response, data);
        } else {
          throw new HTTPError(response, data.message, data.code);
        }
      } else {
        throw new HTTPError(response);
      }
    }
    return response;
  }
}
