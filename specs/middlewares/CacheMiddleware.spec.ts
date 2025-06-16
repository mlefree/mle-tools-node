import {expect} from 'chai';
import {CACHE_TYPE, CacheMiddleware, lru} from '../../src/';

describe('CacheMiddleware', () => {
    const req = {};
    const res = {
        on: (a) => {
            return a;
        },
    };
    const next = () => {};

    before(() => {});

    it('should create CacheMiddleware', async () => {
        const cacheMiddleware = new CacheMiddleware({instanceName: 'test'});
        const middleware = cacheMiddleware.middleWare(CACHE_TYPE.INFINITE);
        expect(await middleware(req, res, next)).eq(undefined);
        // TODO more middlewares test
    });

    it('should use simple lru', async () => {
        expect(await lru({instanceName: 'test'})(req, res, next)).eq(undefined);
    });
});
