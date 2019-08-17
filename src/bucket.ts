import { Timers } from 'detritus-utils';

import { RestRequest } from './request';


export interface RatelimitQueue {
  request: RestRequest,
  reject: any,
  resolve: any,
}

export interface RatelimitDetails {
  limit: number,
  remaining: number,
  resetAfter: number,
  resetAt: number,
  resetAtLocal: number,
}

export class Bucket {
  readonly key: string = '';
  readonly ratelimit: RatelimitDetails = {
    limit: Infinity,
    remaining: Infinity,
    resetAfter: Infinity,
    resetAt: Infinity,
    resetAtLocal: Infinity,
  };
  readonly resetTimeout = new Timers.Timeout();
  readonly timeout = new Timers.Timeout();

  locked: boolean = false;
  queue: Array<RatelimitQueue> = [];

  constructor(key: string) {
    this.key = key;

    Object.defineProperties(this, {
      queue: {enumerable: false},
      timeout: {enumerable: false},
    });
  }

  get length(): number {
    return this.queue.length;
  }

  get size(): number {
    return this.queue.length;
  }

  setRatelimit(
    limit: number,
    remaining: number,
    reset: number,
    resetAfter: number,
    cb?: Function,
  ): this {
    if (isNaN(limit)) {
      limit = Infinity;
    }
    if (isNaN(remaining)) {
      remaining = Infinity;
    }

    this.ratelimit.limit = limit;
    if (this.ratelimit.remaining === Infinity) {
      this.ratelimit.remaining = remaining;
    } else if (remaining <= this.ratelimit.remaining) {
      this.ratelimit.remaining = remaining;
    }

    if (resetAfter < this.ratelimit.resetAfter) {
      this.ratelimit.resetAfter = resetAfter;
      this.ratelimit.resetAt = reset;
    }
    this.ratelimit.resetAtLocal = Math.min(
      Date.now() + resetAfter,
      this.ratelimit.resetAtLocal,
    );

    if (cb) {
      this.resetTimeout.start(resetAfter, cb, false);
    }
    return this;
  }

  lock(unlockIn: number): void {
    if (!unlockIn) {
      return this.shift();
    }

    this.locked = true;
    this.timeout.start(unlockIn, () => {
      this.locked = false;
      this.shift();
    });
  }

  add(delayed: RatelimitQueue, unshift: boolean = false) {
    if (unshift) {
      this.queue.unshift(delayed);
    } else {
      this.queue.push(delayed);
    }
    this.shift();
  }

  shift(): void {
    if (!this.locked && this.size) {
      const delayed = <RatelimitQueue> this.queue.shift();
      delayed.request.send()
        .then(delayed.resolve)
        .catch(delayed.reject)
        .then(() => this.shift());
    }
  }
}
