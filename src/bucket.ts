import { RestRequest } from './request';

class StoredBucket {
  bucket: Bucket;
  expire?: ReturnType<typeof setTimeout>;

  constructor(bucket: Bucket, expire?: ReturnType<typeof setTimeout>) {
    this.bucket = bucket;
    this.expire = expire;
  }

  get hasExpire(): boolean {
    return this.expire !== undefined;
  }

  clearExpire(): void {
    if (this.hasExpire) {
      clearTimeout(<number> <unknown> this.expire);
      this.expire = undefined;
    }
  }
}

export class BucketCollection {
  collection: Map<string, StoredBucket>;
  expireIn: number;

  constructor(options: {
    expireIn?: number,
  } = {}) {
    this.collection = new Map();
    this.expireIn = options.expireIn || 0;
  }

  get length(): number {
    return this.collection.size;
  }

  get size(): number {
    return this.collection.size;
  }

  add(bucket: Bucket): void {
    let expire;
    if (this.expireIn) {
      expire = setTimeout(() => {
        this.delete(bucket.key);
      }, this.expireIn);
    }
    this.set(bucket.key, new StoredBucket(bucket, expire));
  }

  delete(bucketKey: string): boolean {
    if (this.collection.has(bucketKey)) {
      const storedBucket = <StoredBucket> this.collection.get(bucketKey);
      storedBucket.clearExpire();
    }
    return this.collection.delete(bucketKey);
  }

  get(bucketKey: string): Bucket | null {
    if (this.collection.has(bucketKey)) {
      const storedBucket = <StoredBucket> this.collection.get(bucketKey);
      return storedBucket.bucket;
    }
    return null;
  }

  has(bucketKey: string): boolean {
    return this.collection.has(bucketKey);
  }

  set(bucketKey: string, storedBucket: StoredBucket): BucketCollection {
    if (this.has(bucketKey)) {
      this.delete(bucketKey);
    }
    this.collection.set(bucketKey, storedBucket);
    return this;
  }

  startExpire(bucket: Bucket): void {
    if (this.expireIn) {
      const storedBucket = this.collection.get(bucket.key);
      if (storedBucket && storedBucket.hasExpire) {
        storedBucket.expire = setTimeout(() => {
          this.delete(bucket.key);
        }, this.expireIn);
      }
    }
  }

  stopExpire(bucket: Bucket): void {
    if (!this.expireIn) {return;}
    if (this.has(bucket.key)) {
      const storedBucket = <StoredBucket> this.collection.get(bucket.key);
      storedBucket.clearExpire();
    } else {
      this.add(bucket);
    }
  }
}

interface RatelimitQueue {
  request: RestRequest,
  reject: any,
  resolve: any,
}

interface RatelimitDetails {
  last: number,
  limit: number,
  remaining: number,
  reset: number,
}

export class Bucket {
  key: string;
  locked: boolean;
  lockTimeout?: ReturnType<typeof setTimeout>;
  queue: Array<RatelimitQueue>;
  ratelimitDetails: RatelimitDetails;

  constructor(key: string) {
    this.key = key;

    this.locked = false;

    this.queue = [];

    this.ratelimitDetails = {
      last: -1,
      limit: -1,
      remaining: -1,
      reset: -1,
    };
  }

  get length(): number {
    return this.queue.length;
  }

  get size(): number {
    return this.queue.length;
  }

  get hasTimeout() {
    return this.lockTimeout !== undefined;
  }

  lock(unlockIn: number): void {
    if (!unlockIn) {
      return this.shift();
    }

    if (this.locked && this.hasTimeout) {
      clearTimeout(<number> <unknown> this.lockTimeout);
      this.lockTimeout = undefined;
    }
    this.locked = true;
    this.lockTimeout = setTimeout(() => {
      this.locked = false;
      this.shift();
    }, unlockIn);
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
