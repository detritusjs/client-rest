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
  readonly timeout = new Timers.Timeout();

  locked: boolean = false;
  lockedUntil: number = 0;
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

  get unlockIn(): number {
    return Math.max(this.lockedUntil - Date.now(), 0);
  }

  setRatelimit(
    limit: number,
    remaining: number,
    reset: number,
    resetAfter: number,
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
    this.lockedUntil = this.ratelimit.resetAtLocal;

    return this;
  }

  lock(unlockIn: number): void {
    if (!unlockIn) {
      this.timeout.stop();
      this.locked = false;
      return this.shift();
    }

    this.locked = true;
    this.lockedUntil = Date.now() + unlockIn;
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
    if (this.size) {
      if (this.locked && !this.timeout.hasStarted) {
        if (this.lockedUntil <= Date.now()) {
          this.locked = false;
        } else {
          this.timeout.start(this.unlockIn, () => this.reset(), false);
        }
      }

      if (!this.locked) {
        const delayed = <RatelimitQueue> this.queue.shift();
        delayed.request.send()
          .then(delayed.resolve)
          .catch(delayed.reject)
          .then(() => this.shift());
      }
    }
  }

  reset(): void {
    this.ratelimit.limit = Infinity;
    this.ratelimit.remaining = Infinity;
    this.ratelimit.resetAfter = Infinity;
    this.ratelimit.resetAt = Infinity;
    this.ratelimit.resetAtLocal = Infinity;
    this.locked = false;
    this.shift();
  }
}
