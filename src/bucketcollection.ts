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
