"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BucketCollection = void 0;
const detritus_utils_1 = require("detritus-utils");
class BucketCollection extends detritus_utils_1.BaseCollection {
    insert(bucket) {
        this.set(bucket.key, bucket);
    }
    resetExpire(bucket) {
        if (this.has(bucket.key)) {
            this.get(bucket.key);
        }
        else {
            this.insert(bucket);
        }
    }
    startInterval() {
        super.startInterval();
        if (this.interval) {
            this.interval.unref();
        }
    }
    get [Symbol.toStringTag]() {
        return `Buckets (${this.size.toLocaleString()} items)`;
    }
}
exports.BucketCollection = BucketCollection;
