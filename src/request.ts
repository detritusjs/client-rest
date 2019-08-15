import { URL } from 'url';

import {
  Constants as RestConstants,
  Request,
  Response,
  Route,
} from 'detritus-rest';

import { Bucket } from './bucket';
import { Client } from './client';
import { RatelimitHeaders, RatelimitPrecisionTypes } from './constants';
import { Api } from './endpoints';
import { DiscordHTTPError, HTTPError } from './errors';


export class RestRequest {
  bucket?: Bucket;
  client: Client;
  errorOnRatelimit?: boolean;
  maxRetries: number;
  request: Request;
  retries: number;
  retryDelay: number;

  constructor(
    client: Client,
    request: Request,
    options: {
      errorOnRatelimit?: boolean,
    } = {},
  ) {
    this.client = client;
    this.request = request;

    if (
      (client.restClient.baseUrl instanceof URL) &&
      (request.route) &&
      (client.restClient.baseUrl.host === request.url.host)
    ) {
      request.options.headers[RatelimitHeaders.PRECISION] = RatelimitPrecisionTypes.MILLISECOND;

      let bucketKey: string = (
        (request.route.params.guildId || '') + '.' +
        (request.route.params.channelId || '') + '.' +
        (request.route.params.webhookId || '') + '.' +
        (request.route.path || '')
      );

      if (
        (request.route.method === RestConstants.HTTPMethods.DELETE) &&
        (request.route.path === Api.CHANNEL_MESSAGE)
      ) {
        bucketKey = request.route.method + '.' + bucketKey;
      }

      if (this.client.buckets.has(bucketKey)) {
        this.bucket = <Bucket> this.client.buckets.get(bucketKey);
      } else {
        this.bucket = new Bucket(bucketKey);
        this.client.buckets.add(this.bucket);
      }
    }

    this.errorOnRatelimit = options.errorOnRatelimit;
    this.maxRetries = 5;
    this.retries = 0;
    this.retryDelay = 2000;
  }

  maybeExpireBucket() {
    if (this.bucket) {
      if (this.bucket.size) {
        this.client.buckets.stopExpire(this.bucket);
      } else {
        this.client.buckets.startExpire(this.bucket);
      }
    }
  }

  sendRequest(): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (this.bucket && !this.errorOnRatelimit) {
        if (this.client.globalBucket.locked) {
          return this.client.globalBucket.add({request: this, resolve, reject});
        }
        if (this.bucket.locked) {
          return this.bucket.add({request: this, resolve, reject});
        }
        if (this.bucket.ratelimitDetails.remaining === 1) {
          const ratelimit = this.bucket.ratelimitDetails;

          const diff = ratelimit.reset;
          if (diff) {
            this.bucket.lock(diff);
          }
        }
      }
      resolve(this.request.send());
    });
  }

  async send(): Promise<Response> {
    const response = await this.sendRequest();

    if (this.bucket) {
      if (!response.ok && typeof(this.client.onNotOkResponse) === 'function') {
        await Promise.resolve(this.client.onNotOkResponse(response));
      }

      const bucket = <Bucket> this.bucket;
      const ratelimit = bucket.ratelimitDetails;
      let remaining = parseInt(response.headers[RatelimitHeaders.REMAINING]);
      if (isNaN(remaining)) {
        remaining = Infinity;
      }
      if (ratelimit.remaining === Infinity) {
        ratelimit.remaining = remaining;
      } else if (remaining <= ratelimit.remaining) {
        ratelimit.remaining = remaining;
      } else {
        ratelimit.remaining--;
      }
      ratelimit.limit = parseInt(response.headers[RatelimitHeaders.LIMIT]) || Infinity;
      ratelimit.reset = (parseFloat(response.headers[RatelimitHeaders.RESET_AFTER]) || 0) * 1000;

      if (ratelimit.remaining <= 0 && response.statusCode !== 429) {
        const diff = ratelimit.reset;
        if (diff) {
          bucket.lock(diff);
        }
      }

      if (response.statusCode === 429 && !this.errorOnRatelimit) {
        // ratelimited, retry
        const retryAfter = parseInt(response.headers[RatelimitHeaders.RETRY_AFTER]) || 0;
        ratelimit.remaining = 0;
        ratelimit.reset = retryAfter;
        return new Promise((resolve, reject) => {
          const delayed = {request: this, resolve, reject};
          if (response.headers[RatelimitHeaders.GLOBAL] === 'true') {
            this.client.globalBucket.lock(retryAfter);
            this.client.globalBucket.add(delayed);
          } else {
            bucket.lock(retryAfter);
            bucket.add(delayed, true);
          }
          return response.close();
        });
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

    this.maybeExpireBucket();

    const data = await response.body();
    if (!response.ok) {
      if (typeof(data) === 'object') {
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
