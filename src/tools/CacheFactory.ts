import {Cache, caching, MemoryCache, MemoryConfig} from 'cache-manager';
import {redisStore, RedisStore} from 'cache-manager-redis-yet';
import {loggerFactory} from '../logs';
import * as crypto from 'node:crypto';

export enum CACHE_STORE {
    ALL = 0,
    MEMORY = 1,
    REDIS = 2,
}

export enum CACHE_TTL {
    NO = 0,
    SEC = 1000, // only for testing ?
    MINUTE = 60 * 1000,
    TEN_MINUTES = 10 * 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 60 * 60 * 24 * 1000
}

export enum CACHE_COUNT {
    NO = 0,
    SMALL = 1000,
    MEDIUM = 1000 * 100,
    LARGE = 1000 * 10000,
}

export interface ICacheOptions {
    ttl?: CACHE_TTL,
    store?: CACHE_STORE,
}

export interface ICacheConfig {
    redisUrl?: string,
    ttl?: CACHE_TTL,
    max?: CACHE_COUNT,
    store?: CACHE_STORE,
}

export const CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE = {
    ttl: CACHE_TTL.NO
}

export const CACHE_DEFAULT_OPTIONS_LRU = {
    ttl: CACHE_TTL.TEN_MINUTES,
}

export interface ICache {
    set(key: string | any, value: string | any, options?: ICacheOptions): Promise<void>;

    get(key: string | any): Promise<string | any>;

    incr(key: string): Promise<number>;

    execute(options: ICacheOptions, fn: (...params: any[]) => any, ...params: any[]): Promise<any>;

}

export class CacheFactory implements ICache {

    protected config: ICacheConfig = {};
    private memoryCache: MemoryCache;
    private redisCache: Cache<RedisStore<any>>;
    private bypass = false;
    private ok = true;

    constructor() {
        this.config = {
            ttl: CACHE_TTL.TEN_MINUTES,
            max: CACHE_COUNT.SMALL,
            store: CACHE_STORE.MEMORY
        }
    }

    setUp(config: ICacheConfig) {
        this.config = config;
        if (typeof config.ttl === 'undefined') {
            this.config.ttl = CACHE_TTL.TEN_MINUTES;
        }
        if (typeof config.max === 'undefined') {
            this.config.max = CACHE_COUNT.SMALL;
        }
        if (typeof config.store === 'undefined') {
            this.config.store = CACHE_STORE.MEMORY;
        }
    }

    async release() {
        if (this.memoryCache) {
            await this.memoryCache.reset();
        }

        if (this.redisCache?.store?.client?.isReady) {
            // await this.redisCache.reset(); => flushDb FLUSHDB
            await this.redisCache.store.client.quit();
        }
    }

    async reset() {
        await this.init();

        if (this.memoryCache) {
            await this.memoryCache.reset();
        }

        if (this.redisCache?.store?.client?.isReady) {
            await this.redisCache.reset();
        }
    }

    async set(key: string | any,
              value: string | any,
              options: ICacheOptions = CACHE_DEFAULT_OPTIONS_LRU): Promise<void> {
        if (this.bypass || !value) {
            return;
        }

        await this.init();

        let builtKey: string = key;
        let valueToStore = value;
        if (typeof key !== 'string') {
            builtKey = this.buildUniqueKey(key);
            valueToStore = JSON.stringify(value);
        }

        if (this.memoryCache && (!options?.store || options.store === CACHE_STORE.MEMORY)) {
            await this.memoryCache.set(builtKey, valueToStore, options ? options.ttl : this.config.ttl);
        }

        if (this.redisCache && (!options?.store || options.store === CACHE_STORE.REDIS)) {
            await this.redisCache.set(builtKey, valueToStore, options ? options.ttl : this.config.ttl);
        }

    }

    async get(key: string | any): Promise<string | any> {
        this.ok = true;
        if (this.bypass) {
            return undefined;
        }

        await this.init();

        let typeOfValue = 'string';
        let builtKey: string = key;
        if (typeof key !== 'string') {
            builtKey = this.buildUniqueKey(key);
            typeOfValue = 'object';
        }

        let result: any = undefined;
        if (this.memoryCache) {
            result = await this.memoryCache.get(builtKey);
        }
        if (this.redisCache && !result) {
            result = await this.redisCache.get(builtKey);
        }
        if (!!result && typeOfValue === 'object') {
            result = JSON.parse(result);
        }

        // if (result) {
        // console.log('#cached cool...', key);
        // }

        return result;
    }

    async execute(options: ICacheOptions, fn: (...params: any[]) => any, ...params: any[]): Promise<any> {
        await this.init();

        const key = {fnName: fn.name, params};
        let result = await this.get(key);
        if (!result) {
            result = fn.apply(null, params);
            if (result instanceof Promise) {
                result = await result;
            }

            await this.set(key, {result}, options);
        } else {
            result = result.result;
        }

        return result;
    }

    async remove(key: string) {
        await this.init();

        await this.memoryCache?.del(key);
        const result = await this.redisCache?.store?.client?.sendCommand(['DEL', key]); // 'OK';
        // console.log('removed ?', result);
    }

    setBypass(bypass = true) {
        this.bypass = bypass;
    }

    isOk() {
        return this.ok;
    }

    async incr(key: string): Promise<number> {
        const incrKey = 'incr-' + key;
        const value: string = await this.get(incrKey);
        let valueNumber = 0;
        if (value) {
            valueNumber = parseInt(value, 10);
            valueNumber++;
        }

        await this.set(incrKey, valueNumber.toString(10), CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE);
        return Promise.resolve(valueNumber);
    }

    protected async init() {
        if ((this.config.store === CACHE_STORE.MEMORY || this.config.store === CACHE_STORE.ALL)
            && !this.memoryCache) {
            const configMemory = {
                ...this.config
            } as MemoryConfig;

            this.memoryCache = await caching('memory', configMemory);
        }

        if ((this.config.store === CACHE_STORE.REDIS || this.config.store === CACHE_STORE.ALL)
            && !this.redisCache?.store?.client?.isReady) {
            if (!this.config.redisUrl) {
                this.redisCache = null;
            } else {
                try {
                    const configRedis = {
                        ...this.config,
                        url: this.config.redisUrl,
                    } as const;

                    this.redisCache = await caching(redisStore, configRedis);
                    // const redisCacheTtl = await caching(redisStore, configTtl);
                    // if (!this.redisCache?.store?.client?.isReady)
                    // await this.redisCache.store.client.connect();
                    // await redisCache.reset();
                } catch (e) {
                    loggerFactory.getLogger().warn('@cache', e);
                    this.redisCache = null;
                    this.ok = false;
                }
            }
        }
    }

    private buildUniqueKey(key: any) {
        return crypto.createHash('md5').update(JSON.stringify(key)).digest('hex');
    }

}

export const cacheFactory = new CacheFactory();

export class CacheFake implements ICache {
    get(key: any): Promise<any> {
        return Promise.resolve(undefined);
    }

    set(key: any, value: any): Promise<void> {
        return Promise.resolve(undefined);
    }

    incr(key: string): Promise<number> {
        return Promise.resolve(0);
    }

    execute(options: ICacheOptions, fn: (...params: any[]) => any, ...params: any[]) {
        return fn.apply(null, params);
    }
}
