import { URL } from 'url';

import { Request, Response } from 'detritus-rest';
import { ContentTypes, HTTPHeaders, HTTPMethods } from 'detritus-rest/lib/constants';
import { Snowflake } from 'detritus-utils';

import { Bucket } from './bucket';
import { Client } from './client';
import {
  RatelimitHeaders,
  RatelimitPrecisionTypes,
  RatelimitScopes,
  RestEvents,
  MESSAGE_DELETE_RATELIMIT_CHECK,
  MESSAGE_DELETE_RATELIMIT_CHECK_OLDER,
  RATELIMIT_BUCKET_MAJOR_PARAMS,
} from './constants';
import { Api } from './endpoints';
import { DiscordHTTPError, HTTPError } from './errors';


const RATELIMIT_RETRY_AFTER_FALLBACK = 1000;

export interface RestRequestOptions {
  errorOnRatelimit?: boolean,
  errorOnRatelimitIfMoreThan?: number,
  skipRatelimitCheck?: boolean,
}

// every request gets a number in the order it was made, buckets keep their queues sorted by it
let requestSequence = 0;

export class RestRequest {
  readonly bucketPath?: string;
  readonly sequence: number = requestSequence++;

  _bucketHash?: string;
  _bucketKey?: string;

  client: Client;
  errorOnRatelimit?: boolean;
  errorOnRatelimitIfMoreThan?: number;
  maxRatelimitRetries: number;
  maxRetries: number;
  maxSharedRatelimitRetries: number;
  dequeued: boolean = false;
  probeBucket: Bucket | null = null;
  ratelimitRetries: number;
  request: Request;
  retries: number;
  retryDelay: number;
  sharedRatelimitRetries: number;
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
    this.errorOnRatelimitIfMoreThan = options.errorOnRatelimitIfMoreThan;
    this.maxRatelimitRetries = 5;
    this.maxRetries = 5;
    this.maxSharedRatelimitRetries = 20;
    this.ratelimitRetries = 0;
    this.retries = 0;
    this.retryDelay = 2000;
    this.sharedRatelimitRetries = 0;
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
        return this._bucketKey = `${bucketHash}.${this.bucketMajor}`;
      }
    }
    return null;
  }

  get bucketMajor(): string {
    let major = '';
    if (this.request.route) {
      for (let param of RATELIMIT_BUCKET_MAJOR_PARAMS) {
        const value = this.request.route.params[param];
        if (value !== undefined && value !== null) {
          major += String(value).trim();
        }
        major += '-';
      }
    }
    return major.slice(0, -1);
  }

  get isUsingClientToken(): boolean {
    return !!this.client.token && this.request.headers.get('authorization') === this.client.tokenFormatted;
  }

  get shouldRatelimitCheck(): boolean {
    return (
      (this.client.restClient.baseUrl instanceof URL) &&
      (this.client.restClient.baseUrl.host === this.request.parsedUrl.host)
    );
  }

  sendRequest(): Promise<Response> {
    const dequeued = this.dequeued;
    this.dequeued = false;
    return new Promise((resolve, reject) => {
      if (this.client.tokenUnauthorized && this.shouldRatelimitCheck && this.isUsingClientToken) {
        // https://docs.discord.com/developers/topics/rate-limits#invalid-request-limit-aka-cloudflare-bans
        // a previous request returned a 401, keep sending with this token and we will get the ip banned
        return reject(new Error('Refusing to send request, the token was previously rejected with a 401'));
      }

      if (this.shouldRatelimitCheck) {
        let bucket = this.bucket;
        if (!bucket && this.bucketPath && !this.skipRatelimitCheck) {
          const bucketKey = this.bucketKey || `${this.bucketPath}.${this.bucketMajor}`;
          bucket = this.client.buckets.get(bucketKey) || null;
          if (!bucket) {
            bucket = new Bucket(bucketKey);
            this.client.buckets.insert(bucket);
          }
        }
        if (bucket) {
          bucket.expireRatelimit();
        }

        if (this.errorOnRatelimit) {
          // never queued, but don't send what we already know will 429 (every 429 counts towards the cloudflare ban)
          // `locked` can outlive `lockedUntil` when nothing was queued to start the unlock timer
          const globalBucket = this.client.globalBucket;
          let unlockIn = (globalBucket.locked) ? globalBucket.unlockIn : 0;
          if (bucket) {
            bucket.lockIfExhausted();
            if (bucket.locked) {
              unlockIn = Math.max(unlockIn, bucket.unlockIn);
            }
          }
          if (unlockIn) {
            return reject(new Error(`Refusing to send request, ratelimited for ${unlockIn}ms and errorOnRatelimit is enabled`));
          }
        } else {
          if (this.client.globalBucket.locked) {
            return this.waitForBucket(this.client.globalBucket, resolve, reject, dequeued, true);
          }

          if (bucket) {
            bucket.lockIfExhausted();
            if (bucket.locked || (bucket.probe && bucket.probe !== this)) {
              return this.waitForBucket(bucket, resolve, reject, dequeued, true);
            }
          }
        }

        if (bucket) {
          bucket.consume(this);
          if (bucket.probe === this) {
            this.probeBucket = bucket;
          }
        }
      }
      resolve(this.request.send());
    });
  }

  /**
   * @param raw true when called from `sendRequest()`, the queue resumes with `sendRequest()` instead of `send()`
   * so the response only gets handled once (by the `send()` that is awaiting it)
   */
  waitForBucket(bucket: Bucket, resolve: any, reject: any, unshift: boolean = false, raw: boolean = false): void {
    const unlockIn = bucket.unlockIn;
    if (this.errorOnRatelimitIfMoreThan && this.errorOnRatelimitIfMoreThan < unlockIn) {
      return reject(new Error(`Refusing to send request, ratelimited for ${unlockIn}ms which is more than the allowed ${this.errorOnRatelimitIfMoreThan}ms`));
    }
    bucket.add({raw, request: this, resolve, reject}, unshift);
  }

  releaseProbe(): void {
    const bucket = this.probeBucket;
    if (bucket) {
      this.probeBucket = null;
      bucket.releaseProbe(this);
    }
  }

  async send(): Promise<Response> {
    let response: Response;
    try {
      response = await this.sendRequest();
      this.client.emit(RestEvents.RESPONSE, {response, restRequest: this});
    } catch(error) {
      this.releaseProbe();
      throw error;
    }

    if (this.shouldRatelimitCheck) {
      try {
        let bucket: Bucket | null = null;

        // https://docs.discord.com/developers/topics/rate-limits#invalid-request-limit-aka-cloudflare-bans
        switch (response.statusCode) {
          case 401: {
            if (this.client.haltOnUnauthorized && this.isUsingClientToken) {
              this.client.tokenUnauthorized = true;
            }
            this.client.addInvalidRequest();
          }; break;
          case 403: {
            this.client.addInvalidRequest();
          }; break;
          case 429: {
            if (response.headers.get(RatelimitHeaders.SCOPE) !== RatelimitScopes.SHARED) {
              this.client.addInvalidRequest();
            }
          }; break;
        }

        if (this.request.route) {
          // reason for this check is just incase the request doesnt have one and we will still check the global ratelimit

          let shouldHaveBucket: boolean = false;
          if (this.client.isBot) {
            if (response.headers.has(RatelimitHeaders.BUCKET) && this.bucketPath) {
              const bucketHash = response.headers.get(RatelimitHeaders.BUCKET) as string;
              if (this._bucketHash && this._bucketHash !== bucketHash) {
                this._bucketHash = undefined;
                this._bucketKey = undefined;
              }
              this.client.routes.set(this.bucketPath, bucketHash);
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
              bucket.probed = true;
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

          if (response.statusCode !== 429) {
            // locks until `resetAtLocal`, the stored `resetAfter` can be stale if `setRatelimit()` ignored an older response
            bucket.lockIfExhausted();
          }
        }

        if (response.statusCode === 429) {
          // https://docs.discord.com/developers/topics/rate-limits#exceeding-a-rate-limit
          // the body's `retry_after` (float seconds) is the source of truth, the `Retry-After` header is the fallback
          let retryAfter = 0;
          if (response.headers.has(RatelimitHeaders.RETRY_AFTER)) {
            retryAfter = (parseFloat(response.headers.get(RatelimitHeaders.RETRY_AFTER) || '') || 0) * 1000;
          } else if (response.headers.has(RatelimitHeaders.RESET_AFTER)) {
            retryAfter = (parseFloat(response.headers.get(RatelimitHeaders.RESET_AFTER) || '') || 0) * 1000;
          }

          let data: {global?: boolean, message?: string, retry_after?: number} | null = null;
          try {
            // the body is cached, the error thrown below can still read it
            data = await response.json() as {global?: boolean, message?: string, retry_after?: number} | null;
          } catch(error) {
            // cloudflare can send us a non-json body
          }

          if (data && typeof(data.retry_after) === 'number') {
            retryAfter = data.retry_after * 1000;
          }

          const scope = response.headers.get(RatelimitHeaders.SCOPE) || null;
          const isDiscordRatelimit = response.headers.has('via');
          const isGlobal = (
            (response.headers.get(RatelimitHeaders.GLOBAL) === 'true') ||
            (scope === RatelimitScopes.GLOBAL) ||
            (isDiscordRatelimit && !!data && !!data.global)
          );

          if (!retryAfter) {
            const diff = (bucket && !isGlobal) ? bucket.ratelimit.resetAtLocal - Date.now() : 0;
            retryAfter = (0 < diff && diff !== Infinity) ? diff : RATELIMIT_RETRY_AFTER_FALLBACK;
          }

          // lock even if we don't retry (`errorOnRatelimit`, out of retries), otherwise every other request keeps hitting the 429
          if (isGlobal) {
            this.client.globalBucket.lock(retryAfter);
          } else if (bucket) {
            bucket.ratelimit.remaining = 0;
            bucket.ratelimit.resetAfter = retryAfter;
            bucket.lock(retryAfter);
          }

          this.client.emit(RestEvents.RATELIMITED, {
            global: isGlobal,
            response,
            restRequest: this,
            retryAfter,
            scope,
          });

          const shouldRetry = !this.errorOnRatelimit && ((scope === RatelimitScopes.SHARED) ?
            (this.sharedRatelimitRetries++ < this.maxSharedRatelimitRetries) :
            (this.ratelimitRetries++ < this.maxRatelimitRetries));
          if (shouldRetry) {
            if (!isGlobal && !bucket) {
              // probably cloudflare yelling at us, no bucket to wait on so just bail
              throw new HTTPError(response, (data) ? data.message : undefined);
            }

            if (this.errorOnRatelimitIfMoreThan && this.errorOnRatelimitIfMoreThan < retryAfter) {
              throw new Error(`Refusing to send request, ratelimited for ${retryAfter}ms which is more than the allowed ${this.errorOnRatelimitIfMoreThan}ms`);
            }

            const waitOn = (isGlobal) ? this.client.globalBucket : bucket as Bucket;
            const promise = new Promise<Response>((resolve, reject) => {
              waitOn.add({request: this, resolve, reject}, true);
            });
            // after queueing, so the probe's bucket doesn't send its queue ahead of this retry
            this.releaseProbe();
            return promise;
          }

          if (bucket && bucket.size) {
            this.client.buckets.resetExpire(bucket);
          }
        }
        this.releaseProbe();
      } catch(error) {
        // never leave the bucket blocked behind this request (like an event listener throwing)
        this.releaseProbe();
        throw error;
      }
    }

    if (response.statusCode === 502 && this.retries++ < this.maxRetries) {
      // undici keeps the connection busy until an unread body gets garbage collected
      try {
        await response.arrayBuffer();
      } catch(error) {
        // the connection probably died mid-body, nothing to free
      }
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this.send().then(resolve).catch(reject);
        }, this.retryDelay);
        return;
      });
    }

    if (!response.ok) {
      let data: any;
      switch ((response.headers.get(HTTPHeaders.CONTENT_TYPE) || '').split(';').shift()) {
        case ContentTypes.APPLICATION_JSON: {
          try {
            data = await response.json();
          } catch(error) {
            // a proxy's error page or a truncated body, don't lose the status to a bare SyntaxError
            throw new HTTPError(response);
          }
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
