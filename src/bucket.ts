import { Timers } from 'detritus-utils';

import { BucketStates, RefusalReasons } from './constants';
import { RequestRefusedError } from './errors';
import { RestRequest } from './request';


export interface RatelimitQueue {
  // queued from inside `sendRequest()`, the caller's `send()` handles the response
  raw?: boolean,
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

export interface BucketOptions {
  // max queued requests sent per `windowDuration` when draining (0 = no limit)
  maxPerWindow?: number,
  windowDuration?: number,
}

export class Bucket {
  readonly key: string = '';
  readonly maxPerWindow: number = 0;
  readonly windowDuration: number = 1000;
  readonly ratelimit: RatelimitDetails = {
    limit: Infinity,
    remaining: Infinity,
    resetAfter: Infinity,
    resetAt: Infinity,
    resetAtLocal: Infinity,
  };
  readonly timeout = new Timers.Timeout();

  readonly probeTimeout = new Timers.Timeout();

  locked: boolean = false;
  lockedUntil: number = 0;
  probe: RestRequest | null = null;
  probed: boolean = false;
  queue: Array<RatelimitQueue> = [];
  windowCount: number = 0;
  windowResetAt: number = 0;

  constructor(key: string, options: BucketOptions = {}) {
    this.key = key;
    this.maxPerWindow = options.maxPerWindow || this.maxPerWindow;
    this.windowDuration = options.windowDuration || this.windowDuration;

    Object.defineProperties(this, {
      probeTimeout: {enumerable: false},
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

  /**
   * The state the fields below encode, read-only, nothing reads it to make decisions
   */
  get state(): BucketStates {
    if (this.locked && this.unlockIn) {
      return BucketStates.LOCKED;
    }
    if (this.probe) {
      return BucketStates.PROBING;
    }
    const ratelimit = this.ratelimit;
    if (ratelimit.remaining === Infinity) {
      return (this.probed) ? BucketStates.UNLIMITED : BucketStates.UNKNOWN;
    }
    if (ratelimit.resetAtLocal <= Date.now()) {
      // `expireRatelimit()` resets it on the next request
      return BucketStates.UNKNOWN;
    }
    return (ratelimit.remaining) ? BucketStates.OPEN : BucketStates.EXHAUSTED;
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

    const ratelimit = this.ratelimit;
    const resetAtLocal = Date.now() + resetAfter;

    let comparison: number;
    if (ratelimit.resetAtLocal === Infinity) {
      comparison = 1;
    } else if (reset && ratelimit.resetAt && ratelimit.resetAt !== Infinity) {
      comparison = compareWindow(reset - ratelimit.resetAt, 250);
    } else {
      comparison = compareWindow(resetAtLocal - ratelimit.resetAtLocal, 1000);
    }

    if (comparison < 0) {
      return this;
    }

    ratelimit.limit = limit;
    if (comparison === 0) {
      ratelimit.remaining = Math.min(remaining, ratelimit.remaining);
    } else {
      ratelimit.remaining = remaining;
    }
    ratelimit.resetAfter = resetAfter;
    ratelimit.resetAt = reset;
    ratelimit.resetAtLocal = resetAtLocal;

    return this;
  }

  consume(request: RestRequest): void {
    const ratelimit = this.ratelimit;
    if (ratelimit.remaining !== Infinity) {
      ratelimit.remaining = Math.max(ratelimit.remaining - 1, 0);
      this.lockIfExhausted();
    } else if (!this.probed) {
      this.probed = true;
      this.probe = request;
      // safety net so a probe that never settles can't block the bucket forever
      this.probeTimeout.start(BUCKET_PROBE_TIMEOUT, () => {
        if (this.probe === request) {
          this.clearProbe(false);
        }
      });
    }
  }

  /**
   * @param learned false when the probe failed (network error, 5xx, timeout), the next request probes again
   * true when it got a response, a route without ratelimit headers then stays `probed` so requests go out together
   */
  clearProbe(learned: boolean = false): void {
    this.probeTimeout.stop();
    this.probe = null;
    if (!learned && this.ratelimit.remaining === Infinity) {
      this.probed = false;
    }
    this.shift();
  }

  releaseProbe(request: RestRequest, learned: boolean = false): void {
    if (this.probe === request) {
      this.clearProbe(learned);
    }
  }

  expireRatelimit(): void {
    if (this.ratelimit.resetAtLocal <= Date.now()) {
      this.resetRatelimit();
    }
  }

  lockIfExhausted(): void {
    const ratelimit = this.ratelimit;
    if (ratelimit.remaining <= 0) {
      const diff = ratelimit.resetAtLocal - Date.now();
      if (0 < diff && diff !== Infinity) {
        this.lock(diff);
      }
    }
  }

  lock(unlockIn: number): void {
    if (!unlockIn) {
      if (this.locked && Date.now() < this.lockedUntil) {
        return;
      }
      this.timeout.stop();
      this.locked = false;
      return this.shift();
    }

    const lockedUntil = Date.now() + unlockIn;
    if (this.locked && lockedUntil <= this.lockedUntil) {
      return;
    }

    this.locked = true;
    this.lockedUntil = lockedUntil;
    if (this.timeout.hasStarted) {
      this.timeout.start(this.unlockIn, () => this.reset(), true);
    }
    this.rejectOverLimit();
  }

  /**
   * If the bucket is pacing its drain, requests sent around the queue now would go over `maxPerWindow`
   */
  get isPacing(): boolean {
    return !!this.maxPerWindow && (!!this.size || Date.now() < this.windowResetAt);
  }

  /**
   * If expiring this bucket from `BucketCollection` would lose state
   */
  get isBusy(): boolean {
    return !!this.size || !!this.probe || (this.locked && !!this.unlockIn);
  }

  /**
   * Rejects and removes every queued request `filter` matches, returns how many
   */
  rejectQueued(filter: (request: RestRequest) => boolean, createError: () => Error): number {
    const queue = this.queue;
    let rejected = 0;
    for (let i = queue.length - 1; 0 <= i; i--) {
      const delayed = queue[i];
      if (filter(delayed.request)) {
        queue.splice(i, 1);
        delayed.reject(createError());
        rejected++;
      }
    }
    return rejected;
  }

  // `errorOnRatelimitIfMoreThan` is checked when a request is queued, a lock afterwards (a 429) can make it wait longer
  rejectOverLimit(): void {
    const queue = this.queue;
    const unlockIn = this.unlockIn;
    for (let i = queue.length - 1; 0 <= i; i--) {
      const delayed = queue[i];
      const max = delayed.request.errorOnRatelimitIfMoreThan;
      if (max && max < unlockIn) {
        queue.splice(i, 1);
        delayed.reject(new RequestRefusedError(
          RefusalReasons.RATELIMITED_TOO_LONG,
          `Refusing to send request, ratelimited for ${unlockIn}ms which is more than the allowed ${max}ms`,
          unlockIn,
        ));
      }
    }
  }

  /**
   * Queues by `RestRequest.sequence`, so a request moved between buckets or retried after a 429 keeps its place
   * @param unshift unused, kept for compatibility
   */
  add(delayed: RatelimitQueue, unshift: boolean = false) {
    const queue = this.queue;
    const sequence = delayed.request.sequence;
    if (!queue.length || queue[queue.length - 1].request.sequence < sequence) {
      queue.push(delayed);
    } else {
      // first queued request that was made after this one
      let low = 0, high = queue.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (queue[middle].request.sequence < sequence) {
          low = middle + 1;
        } else {
          high = middle;
        }
      }
      queue.splice(low, 0, delayed);
    }
    this.shift();
  }

  shift(): void {
    while (this.size) {
      if (this.locked && !this.timeout.hasStarted) {
        if (this.lockedUntil <= Date.now()) {
          this.locked = false;
        } else {
          this.timeout.start(this.unlockIn, () => this.reset(), false);
        }
      }

      if (this.locked || this.probe) {
        break;
      }

      if (this.maxPerWindow) {
        // sending the whole queue at once goes over the global limit and 429s again
        const now = Date.now();
        if (this.windowResetAt <= now) {
          this.windowCount = 0;
          this.windowResetAt = now + this.windowDuration;
        }
        if (this.maxPerWindow <= this.windowCount) {
          // wait a full window after the last send (not the first), so no 1s span holds more than `maxPerWindow`
          this.windowCount = 0;
          this.windowResetAt = 0;
          this.lock(this.windowDuration);
          continue;
        }
        this.windowCount++;
      }

      const delayed = <RatelimitQueue> this.queue.shift();
      // unused, `add()` orders the queue by `RestRequest.sequence` instead
      delayed.request.dequeued = true;
      // so `sendRequest()` doesn't queue it right back into this bucket for pacing
      delayed.request.dequeuedFrom = this;
      const promise = (delayed.raw) ? delayed.request.sendRequest() : delayed.request.send();
      promise
        .then(delayed.resolve)
        .catch(delayed.reject)
        .then(() => this.shift());
    }
  }

  reset(): void {
    this.resetRatelimit();
    this.locked = false;
    this.shift();
  }

  resetRatelimit(): void {
    this.ratelimit.limit = Infinity;
    this.ratelimit.remaining = Infinity;
    this.ratelimit.resetAfter = Infinity;
    this.ratelimit.resetAt = Infinity;
    this.ratelimit.resetAtLocal = Infinity;
    this.probed = false;
  }
}


// a probe only blocks its bucket for this long before the queue is let through
export const BUCKET_PROBE_TIMEOUT = 30000;


function compareWindow(difference: number, tolerance: number): number {
  if (Math.abs(difference) <= tolerance) {
    return 0;
  }
  return Math.sign(difference);
}
