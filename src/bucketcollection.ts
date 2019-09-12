import { BaseCollection, BaseCollectionOptions } from 'detritus-utils';

import { Bucket } from './bucket';


export class BucketCollection extends BaseCollection<string, Bucket> {
  constructor(options: BaseCollectionOptions = {}) {
    super(options);
    this.interval.unref();
  }

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

  get [Symbol.toStringTag](): string {
    return `Buckets (${this.size.toLocaleString()} items)`;
  }
}
