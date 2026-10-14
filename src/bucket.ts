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

  readonly probeTimeout = new Timers.Timeout();

  locked: boolean = false;
  lockedUntil: number = 0;
  probe: RestRequest | null = null;
  probed: boolean = false;
  queue: Array<RatelimitQueue> = [];

  constructor(key: string) {
    this.key = key;

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
          this.probe = null;
          this.shift();
        }
      });
    }
  }

  releaseProbe(request: RestRequest): void {
    if (this.probe === request) {
      this.probeTimeout.stop();
      this.probe = null;
      this.shift();
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
      const delayed = <RatelimitQueue> this.queue.shift();
      // if it gets requeued (bucket locked again), it goes back to the front instead of behind newer requests
      delayed.request.dequeued = true;
      delayed.request.send()
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


// a probe request only blocks its bucket for this long before the queue is let through anyways
export const BUCKET_PROBE_TIMEOUT = 30000;


function compareWindow(difference: number, tolerance: number): number {
  if (Math.abs(difference) <= tolerance) {
    return 0;
  }
  return Math.sign(difference);
}
