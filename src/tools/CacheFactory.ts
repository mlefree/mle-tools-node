import {Cache, caching, MemoryCache, MemoryConfig} from 'cache-manager';
import {redisStore, RedisStore} from 'cache-manager-redis-yet';
import {loggerFactory} from '../logger';
import hash from 'object-hash';

export enum CACHE_STORE {
    NONE = 0,
    MEMORY = 1,
    REDIS = 2,
    ALL = 3,
}

export enum CACHE_TTL {
    NO = 0,
    SEC = 1000, // only for testing ?
    MINUTE = 60 * 1000,
    TEN_MINUTES = 10 * 60 * 1000,
    HOUR = 60 * 60 * 1000,
    DAY = 60 * 60 * 24 * 1000,
}

export enum CACHE_COUNT {
    NO = 0,
    SMALL = 1000,
    MEDIUM = 1000 * 100,
    LARGE = 1000 * 10000,
}

export interface ICacheOptions {
    ttl?: CACHE_TTL;
    store?: CACHE_STORE;
}

export interface ICacheConfig {
    instanceName: string;
    redisUrl?: string;
    redisConfig?: any;
    ttl?: CACHE_TTL;
    max?: CACHE_COUNT;
    store?: CACHE_STORE;
}

export const CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE = {
    ttl: CACHE_TTL.NO,
};

export const CACHE_DEFAULT_OPTIONS_LRU = {
    ttl: CACHE_TTL.TEN_MINUTES,
};

export interface ICache {
    set(key: string | object, value: string | object, options?: ICacheOptions): Promise<void>;

    setIfNotExists(
        key: string | object,
        value: string | object,
        options?: ICacheOptions
    ): Promise<boolean>;

    get(key: string | object): Promise<string | any>;

    incr(key: string): Promise<number>;

    execute(
        options: ICacheOptions,
        fn: (...params: any[]) => any,
        ...params: any[]
    ): Promise<object>;
}

export class CacheFactory implements ICache {
    protected config: ICacheConfig;
    private memoryCache: MemoryCache;
    private redisCache: Cache<RedisStore<any>>;
    private bypass = false;
    private ok = true;

    constructor() {
        this.config = {
            instanceName: 'default',
            ttl: CACHE_TTL.TEN_MINUTES,
            max: CACHE_COUNT.SMALL,
            store: CACHE_STORE.MEMORY,
        };
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

    async set(
        key: string | object,
        value: string | object,
        options?: ICacheOptions
    ): Promise<void> {
        if (this.bypass || !value) {
            return;
        }

        await this.init();

        const builtKey = this.buildUniqueKey(key);
        // let valueToStore = value;
        // if (typeof key !== 'string') {
        //     valueToStore = JSON.stringify(value);
        // }
        const valueToStore = JSON.stringify(value);

        if (this.memoryCache && (!options?.store || options.store === CACHE_STORE.MEMORY)) {
            await this.memoryCache.set(
                builtKey,
                valueToStore,
                options ? options.ttl : this.config.ttl
            );
        }

        if (this.redisCache && (!options?.store || options.store === CACHE_STORE.REDIS)) {
            await this.redisCache.set(
                builtKey,
                valueToStore,
                options ? options.ttl : this.config.ttl
            );
        }
    }

    async setIfNotExists(
        key: string | object,
        value: string | object,
        options?: ICacheOptions
    ): Promise<boolean> {
        if (this.bypass || !value) {
            return false;
        }

        await this.init();

        const builtKey = this.buildUniqueKey(key);
        // let valueToStore = value;
        // if (typeof key !== 'string') {
        //     valueToStore = JSON.stringify(value);
        // }
        const valueToStore = JSON.stringify(value);

        // For Redis - use SET with NX option (atomic operation)
        if (this.redisCache && (!options?.store || options.store === CACHE_STORE.REDIS)) {
            const ttl = options ? options.ttl : this.config.ttl;
            const redisClient = this.redisCache.store.client;

            if (ttl && ttl > 0) {
                // SET key value NX PX milliseconds
                const result = await redisClient.sendCommand([
                    'SET',
                    builtKey,
                    valueToStore,
                    'NX',
                    'PX',
                    ttl.toString(),
                ]);
                return result === 'OK';
            } else {
                // SET key value NX (no expiration)
                const result = await redisClient.sendCommand(['SET', builtKey, valueToStore, 'NX']);
                return result === 'OK';
            }
        }

        // For memory cache - check and set (not atomic, but single-threaded in Node.js)
        if (this.memoryCache && (!options?.store || options.store === CACHE_STORE.MEMORY)) {
            const existing = await this.memoryCache.get(builtKey);
            if (existing === undefined) {
                await this.memoryCache.set(
                    builtKey,
                    valueToStore,
                    options ? options.ttl : this.config.ttl
                );
                return true;
            }
            return false;
        }

        return false;
    }

    async get(key: string | object): Promise<string | any> {
        this.ok = true;
        if (this.bypass) {
            return undefined;
        }

        await this.init();

        let typeOfValue = 'string';
        const builtKey = this.buildUniqueKey(key);
        if (typeof key !== 'string') {
            typeOfValue = 'object';
        }

        let result: string | object;
        if (this.memoryCache) {
            result = await this.memoryCache.get(builtKey);
        }
        if (this.redisCache && !result) {
            result = await this.redisCache.get(builtKey);
        }

        // if (!!result && typeOfValue === 'object') {
        if (typeof result === 'string') {
            result = JSON.parse(result);
        } else if (result) {
            loggerFactory
                .getLogger()
                .warn(`(mtn) @cache get typeOfValue issue: ${JSON.stringify(result)}`);
        }
        // }

        return result;
    }

    async execute(
        options: ICacheOptions,
        fn: (...params: any[]) => any,
        ...params: any[]
    ): Promise<object> {
        await this.init();

        const key = {fnName: fn.name, params};
        let result: any = await this.get(key);
        if (!result) {
            result = fn(...params);
            if (result instanceof Promise) {
                result = await result;
            }

            await this.set(key, {result}, options);
        } else if (typeof result === 'object') {
            result = result.result;
        }

        return result;
    }

    async remove(key: string) {
        await this.init();

        const builtKey = this.buildUniqueKey(key);
        await this.memoryCache?.del(builtKey);
        await this.redisCache?.store?.client?.sendCommand(['DEL', builtKey]);
    }

    async removeByPattern(keyPattern: string): Promise<number> {
        await this.init();

        const pattern = this.buildUniqueKey(keyPattern) + '*';
        let deletedCount = 0;

        // Remove from Redis cache using SCAN + DEL
        if (this.redisCache?.store?.client?.isReady) {
            try {
                const redisClient = this.redisCache.store.client;
                let cursor = 0;

                do {
                    const result = await redisClient.sendCommand([
                        'SCAN',
                        cursor.toString(),
                        'MATCH',
                        pattern,
                        'COUNT',
                        '100',
                    ]);
                    cursor = parseInt(result[0] as string, 10);
                    const keys = result[1] as string[];

                    if (keys.length > 0) {
                        const delResult = await redisClient.sendCommand(['DEL', ...keys]);
                        deletedCount += delResult as number;
                    }
                } while (cursor !== 0);
            } catch (err) {
                loggerFactory.getLogger().error('(mtn) @cache removeByPattern Redis error:', err);
            }
        }

        // Note: Memory cache doesn't support pattern-based removal efficiently
        // For memory cache, we'd need to iterate all keys which is not practical
        // Memory cache entries will expire naturally based on TTL

        return deletedCount;
    }

    setBypass(bypass = true) {
        this.bypass = bypass;
    }

    isOk() {
        return this.ok;
    }

    async incr(key: string): Promise<number> {
        const incrKey = 'incr-' + key;
        const value = await this.get(incrKey);
        let valueNumber = 0;
        if (typeof value === 'string') {
            valueNumber = parseInt(value, 10);
            valueNumber++;
        }

        await this.set(
            incrKey,
            valueNumber.toString(10),
            CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE
        );
        return Promise.resolve(valueNumber);
    }

    protected async init() {
        if (
            (this.config.store === CACHE_STORE.MEMORY || this.config.store === CACHE_STORE.ALL) &&
            !this.memoryCache
        ) {
            const configMemory = {
                ...this.config,
            } as MemoryConfig;

            this.memoryCache = await caching('memory', configMemory);
        }

        if (
            (this.config.store === CACHE_STORE.REDIS || this.config.store === CACHE_STORE.ALL) &&
            !this.redisCache?.store?.client?.isReady
        ) {
            if (!this.config.redisUrl) {
                this.redisCache = null;
            } else {
                try {
                    let configRedis: any = this.config;
                    configRedis = {
                        ...configRedis,
                        ...this.config.redisConfig,
                    };
                    configRedis = {
                        ...configRedis,
                        url: this.config.redisUrl,
                    } as const;

                    this.redisCache = await caching(redisStore, configRedis);
                    // const redisCacheTtl = await caching(redisStore, configTtl);
                    // if (!this.redisCache?.store?.client?.isReady)
                    // await this.redisCache.store.client.connect();
                    // await redisCache.reset();
                } catch (e) {
                    loggerFactory.getLogger().warn('(mtn) @cache', e);
                    this.redisCache = null;
                    this.ok = false;
                }
            }
        }
    }

    private buildUniqueKey(key: any): string {
        let newKey = key;
        if (typeof key !== 'string') {
            newKey = hash(key);
        }
        return this.config.instanceName + '-' + newKey;
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

    setIfNotExists(key: any, value: any): Promise<boolean> {
        return Promise.resolve(true);
    }

    incr(key: string): Promise<number> {
        return Promise.resolve(0);
    }

    execute(options: ICacheOptions, fn: (...params: any[]) => any, ...params: any[]) {
        return fn(...params);
    }
}
