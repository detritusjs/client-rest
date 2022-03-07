import { Timers } from 'detritus-utils';
import { RestRequest } from './request';
export interface RatelimitQueue {
    request: RestRequest;
    reject: any;
    resolve: any;
}
export interface RatelimitDetails {
    limit: number;
    remaining: number;
    resetAfter: number;
    resetAt: number;
    resetAtLocal: number;
}
export declare class Bucket {
    readonly key: string;
    readonly ratelimit: RatelimitDetails;
    readonly timeout: Timers.Timeout;
    locked: boolean;
    lockedUntil: number;
    queue: Array<RatelimitQueue>;
    constructor(key: string);
    get length(): number;
    get size(): number;
    get unlockIn(): number;
    setRatelimit(limit: number, remaining: number, reset: number, resetAfter: number): this;
    lock(unlockIn: number): void;
    add(delayed: RatelimitQueue, unshift?: boolean): void;
    shift(): void;
    reset(): void;
}
