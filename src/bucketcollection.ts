import { BaseCollection, BaseCollectionOptions } from 'detritus-utils';

import { Bucket } from './bucket';


export class BucketCollection extends BaseCollection<string, Bucket> {
  insert(bucket: Bucket) {
    this.set(bucket.key, bucket);
  }

  resetExpire(bucket: Bucket) {
    if (this.has(bucket.key)) {
      this.get(bucket.key);
    } else {
      this.insert(bucket);
    }
  }

  /**
   * A busy bucket isn't deleted, its expiry is pushed back instead
   * otherwise the next request would make a fresh unlocked bucket and send into a known 429 (`clear()` drops busy buckets too)
   */
  delete(key: string): boolean {
    const bucket = this.cache.get(key);
    if (bucket && bucket.isBusy) {
      if (this.expire) {
        const lastUsed = this.lastUsed;
        lastUsed.delete(key);
        lastUsed.set(key, Date.now());
      }
      return false;
    }
    return super.delete(key);
  }

  get(key: string): Bucket | undefined {
    // a lazy expiry in `get()` hands out nothing even when `delete()` kept the bucket
    return super.get(key) || this.cache.get(key);
  }

  startInterval(): void {
    super.startInterval();
    if (this.interval) {
      this.interval.unref();
    }
  }

  get [Symbol.toStringTag](): string {
    return `Buckets (${this.size.toLocaleString()} items)`;
  }
}
