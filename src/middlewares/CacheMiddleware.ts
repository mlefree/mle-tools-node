import {
    CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE,
    CACHE_DEFAULT_OPTIONS_LRU,
    cacheFactory,
    CacheFactory,
    ICacheConfig,
} from '../tools';
import {loggerFactory} from '../logger';

export enum CACHE_TYPE {
    LRU = 0,
    INFINITE = 1,
}

export class CacheMiddleware {
    protected cache: CacheFactory;

    constructor(protected config?: ICacheConfig) {}

    private static TimingStart(res: any, step: string) {
        if (typeof res.startTime === 'function') {
            res.startTime(step);
        }
    }

    private static TimingEnd(res: any, step: string) {
        if (typeof res.endTime === 'function') {
            res.endTime(step);
        }
    }

    public middleWare(type: CACHE_TYPE = CACHE_TYPE.LRU) {
        let cacheOptions = CACHE_DEFAULT_OPTIONS_LRU;
        if (type === CACHE_TYPE.INFINITE) {
            cacheOptions = CACHE_DEFAULT_OPTIONS_AS_MUCH_AS_POSSIBLE;
        }

        if (!this.cache) {
            if (this.config) {
                // console.log('@cache new middleWare');
                this.cache = new CacheFactory();
                this.cache.setUp(this.config);
                if (this.config.ttl) {
                    cacheOptions = {ttl: this.config.ttl};
                }
            } else {
                // console.log('@cache new middleWare with', cacheFactory);
                this.cache = cacheFactory;
            }
        }

        return async (req: any, res: any, next: (err?: any) => void): Promise<void> => {
            const key = req.originalUrl; // {url: req.originalUrl};

            try {
                const step1 = 'CacheM-get';
                CacheMiddleware.TimingStart(res, step1);
                const cachedResponse = await this.cache.get(key);
                CacheMiddleware.TimingEnd(res, step1);

                if (cachedResponse) {
                    loggerFactory.getLogger().info('(mtn) @cache yes', JSON.stringify(key));
                    res.jsonp(cachedResponse);
                } else {
                    loggerFactory.getLogger().info('(mtn) @cache no_', JSON.stringify(key));

                    res.sendResponse = res.jsonp;
                    res.jsonp = async (body: any) => {
                        if (res.statusCode >= 400) {
                            return res.sendResponse(body);
                        }

                        const step3 = 'CacheM-set';
                        CacheMiddleware.TimingStart(res, step3);

                        // limit to a large response value (e.g., 10MB -> 50MB)
                        if (JSON.stringify(body).length < 50000000) {
                            // No Need to stop response ? :
                            this.cache.set(key, body, cacheOptions).then((ignored) => {});
                        } else {
                            loggerFactory
                                .getLogger()
                                .info(
                                    '(mtn) @cache body too large to be cached',
                                    JSON.stringify(key)
                                );
                        }

                        CacheMiddleware.TimingEnd(res, step3);
                        return res.sendResponse(body);
                    };

                    next();
                }
            } catch (err) {
                next(err);
            }
        };
    }
}

export const lru = (options?: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.LRU);
};

export const infinite = (options?: ICacheConfig) => {
    const cacheMiddleware = new CacheMiddleware(options);
    return cacheMiddleware.middleWare(CACHE_TYPE.INFINITE);
};
