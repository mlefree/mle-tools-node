import {CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE, CACHE_DEFAULT_OPTIONS_LRU, cacheFactory, CacheFactory, ICacheConfig} from '../tools';
import {loggerFactory} from '../logs';

export enum CACHE_TYPE {
    LRU = 0,
    INFINITE = 1
}

export class CacheMiddleware {
    protected cache: CacheFactory;

    constructor(protected config?: ICacheConfig) {
    }

    public middleWare(type: CACHE_TYPE = CACHE_TYPE.LRU) {

        if (!this.cache) {
            if (this.config) {
                // console.log('@cache new middleWare');
                this.cache = new CacheFactory();
                this.cache.setUp(this.config);
            } else {
                // console.log('@cache new middleWare with', cacheFactory);
                this.cache = cacheFactory;
            }
        }

        let cacheOptions = CACHE_DEFAULT_OPTIONS_LRU;
        if (type === CACHE_TYPE.INFINITE) {
            cacheOptions = CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE;
        }

        return async (req: any, res: any, next: (err?: any) => void) => {
            const key = req.originalUrl; // {url: req.originalUrl};

            try {

                let step = 'CacheMiddleware-get';
                let stepTrack = res.startTime ? res.startTime(step) : null;

                const cachedResponse = await this.cache.get(key);

                stepTrack = res.endTime ? res.endTime(step) : null;

                if (cachedResponse) {
                    loggerFactory.getLogger().info('@cache yes', JSON.stringify(key));
                    return res.jsonp(cachedResponse);
                } else {
                    loggerFactory.getLogger().info('@cache no', JSON.stringify(key));
                    step = 'CacheMiddleware-setPrepare';
                    stepTrack = res.startTime ? res.startTime(step) : null;

                    res.sendResponse = res.jsonp;
                    res.jsonp = async (body: any) => {

                        const step2 = 'CacheMiddleware-set';
                        stepTrack = res.startTime ? res.startTime(step2) : null;

                        if (JSON.stringify(body).length < 10000000) {
                            // No Need to stop response ? :
                            // await this.cache.set(key, body, cacheOptions);
                            this.cache.set(key, body, cacheOptions).then(ignored => {
                            });
                        } else {
                            loggerFactory.getLogger().info('@cache body too large to be cached', JSON.stringify(key));
                        }

                        stepTrack = res.endTime ? res.endTime(step2) : null;

                        res.sendResponse(body);
                    };

                    stepTrack = res.endTime ? res.endTime(step) : null;
                    next();
                }
            } catch (err) {
                next(err);
            }
        };
    }
}

export const lru = ((options?: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.LRU);
});

export const infinite = ((options?: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.INFINITE);
});
