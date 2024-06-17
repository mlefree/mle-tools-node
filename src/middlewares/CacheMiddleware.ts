import {CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE, CACHE_DEFAULT_OPTIONS_LRU, cacheFactory, CacheFactory, ICacheConfig} from '../tools';

export enum CACHE_TYPE {
    LRU = 0,
    INFINITE = 1
}

export class CacheMiddleware {
    protected cache: CacheFactory;

    constructor(protected config?: ICacheConfig) {
    }

    public middleWare(type: CACHE_TYPE = CACHE_TYPE.LRU) {

        if (this.config) {
            this.cache = new CacheFactory();
            this.cache.setUp(this.config);
        } else {
            this.cache = cacheFactory;
        }

        let cacheOptions = CACHE_DEFAULT_OPTIONS_LRU;
        if (type === CACHE_TYPE.INFINITE) {
            cacheOptions = CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE;
        }

        return async (req: any, res: any, next: (err?: any) => void) => {
            const key = {url: req.originalUrl};

            try {
                const cachedResponse = await this.cache.get(key);
                if (cachedResponse) {
                    return res.jsonp(cachedResponse);
                } else {
                    res.sendResponse = res.jsonp;
                    res.jsonp = async (body: any) => {
                        await this.cache.set(key, body, cacheOptions);
                        res.sendResponse(body);
                    };
                    next();
                }
            } catch (err) {
                next(err);
            }
        };
    }
}

export const lru = ((options: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.LRU);
});

export const infinite = ((options: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.INFINITE);
});
