"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bucket = void 0;
const detritus_utils_1 = require("detritus-utils");
class Bucket {
    key = '';
    ratelimit = {
        limit: Infinity,
        remaining: Infinity,
        resetAfter: Infinity,
        resetAt: Infinity,
        resetAtLocal: Infinity,
    };
    timeout = new detritus_utils_1.Timers.Timeout();
    locked = false;
    lockedUntil = 0;
    queue = [];
    constructor(key) {
        this.key = key;
        Object.defineProperties(this, {
            queue: { enumerable: false },
            timeout: { enumerable: false },
        });
    }
    get length() {
        return this.queue.length;
    }
    get size() {
        return this.queue.length;
    }
    get unlockIn() {
        return Math.max(this.lockedUntil - Date.now(), 0);
    }
    setRatelimit(limit, remaining, reset, resetAfter) {
        if (isNaN(limit)) {
            limit = Infinity;
        }
        if (isNaN(remaining)) {
            remaining = Infinity;
        }
        this.ratelimit.limit = limit;
        if (this.ratelimit.remaining === Infinity) {
            this.ratelimit.remaining = remaining;
        }
        else if (remaining <= this.ratelimit.remaining) {
            this.ratelimit.remaining = remaining;
        }
        if (resetAfter < this.ratelimit.resetAfter) {
            this.ratelimit.resetAfter = resetAfter;
            this.ratelimit.resetAt = reset;
        }
        this.ratelimit.resetAtLocal = Math.min(Date.now() + resetAfter, this.ratelimit.resetAtLocal);
        this.lockedUntil = this.ratelimit.resetAtLocal;
        return this;
    }
    lock(unlockIn) {
        if (!unlockIn) {
            this.timeout.stop();
            this.locked = false;
            return this.shift();
        }
        this.locked = true;
        this.lockedUntil = Date.now() + unlockIn;
    }
    add(delayed, unshift = false) {
        if (unshift) {
            this.queue.unshift(delayed);
        }
        else {
            this.queue.push(delayed);
        }
        this.shift();
    }
    shift() {
        if (this.size) {
            if (this.locked && !this.timeout.hasStarted) {
                if (this.lockedUntil <= Date.now()) {
                    this.locked = false;
                }
                else {
                    this.timeout.start(this.unlockIn, () => this.reset(), false);
                }
            }
            if (!this.locked) {
                const delayed = this.queue.shift();
                delayed.request.send()
                    .then(delayed.resolve)
                    .catch(delayed.reject)
                    .then(() => this.shift());
            }
        }
    }
    reset() {
        this.ratelimit.limit = Infinity;
        this.ratelimit.remaining = Infinity;
        this.ratelimit.resetAfter = Infinity;
        this.ratelimit.resetAt = Infinity;
        this.ratelimit.resetAtLocal = Infinity;
        this.locked = false;
        this.shift();
    }
}
exports.Bucket = Bucket;
