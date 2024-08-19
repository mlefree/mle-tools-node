import {expect} from 'chai';
import {CACHE_STORE, CACHE_TTL, CacheFactory, ICacheConfig, ICacheOptions} from '../../src';
import {promisify} from 'util';

const sleep = promisify(setTimeout);

describe('Cache', () => {

    const cacheTest = async (store: ICacheConfig) => {
        const cacheFactory = new CacheFactory();
        cacheFactory.setUp(store);
        await cacheFactory.reset();

        // without setting
        expect(await cacheFactory.get('key')).eq(undefined);
        expect(await cacheFactory.get({key: true})).eq(undefined);

        // set
        await cacheFactory.set('key', 'value1');
        await cacheFactory.set({key1: true}, {value1: 1}, {ttl: CACHE_TTL.SEC, store: CACHE_STORE.MEMORY});
        await cacheFactory.set({key2: true}, {value2: 2}, {ttl: CACHE_TTL.SEC, store: CACHE_STORE.REDIS});

        // cached
        expect(await cacheFactory.get('key')).eq('value1', JSON.stringify(store))
        if (store.store === CACHE_STORE.MEMORY) {
            expect((await cacheFactory.get({key1: true}))?.value1).eq(1, JSON.stringify(store));
            expect((await cacheFactory.get({key2: true}))).eq(undefined, JSON.stringify(store));
        } else if (store.store === CACHE_STORE.REDIS) {
            expect((await cacheFactory.get({key1: true}))).eq(undefined, JSON.stringify(store));
            expect((await cacheFactory.get({key2: true}))?.value2).eq(2, JSON.stringify(store));
        } else {
            expect((await cacheFactory.get({key1: true}))?.value1).eq(1, JSON.stringify(store));
            expect((await cacheFactory.get({key2: true}))?.value2).eq(2, JSON.stringify(store));
        }

        // cached partially expired
        await sleep(1200);
        expect(await cacheFactory.get('key')).eq('value1', JSON.stringify(store));
        expect(await cacheFactory.get({key1: true})).eq(undefined);
        expect(await cacheFactory.get({key2: true})).eq(undefined);

        // cached removed
        await cacheFactory.remove('key');
        // const cf = new CacheFactory();
        // cf.setUp(store);
        // await cf.remove('key');

        expect(await cacheFactory.get('key')).eq(undefined, JSON.stringify(store));

        // bypassing cache
        cacheFactory.setBypass(true);
        expect(await cacheFactory.get('key')).eq(undefined, JSON.stringify(store));
        expect(await cacheFactory.get({key1: true})).eq(undefined);
        expect(await cacheFactory.get({key2: true})).eq(undefined);

        // cache's ended
        await cacheFactory.release();
        expect(await cacheFactory.get('key')).eq(undefined, JSON.stringify(store));
        expect(await cacheFactory.get({key1: true})).eq(undefined);
        expect(await cacheFactory.get({key2: true})).eq(undefined);

        expect(cacheFactory.isOk()).eq(true);
    }

    it('should MEMORY cache get and set', async () => {
        await cacheTest({
            redisUrl: 'existingOrNot... does not matters',
            store: CACHE_STORE.MEMORY
        });
    });

    it('should REDIS cache get and set', async () => {
        await cacheTest({
            redisUrl: 'redis://localhost:6379', //  required (see docker-compose.yml)
            store: CACHE_STORE.REDIS
        });
    });

    it('should ALL cache get and set', async () => {
        await cacheTest({
            redisUrl: 'redis://localhost:6379', //  required (see docker-compose.yml)
            store: CACHE_STORE.ALL
        });
    });

    it('should execute cached function', async () => {

        const cacheFactory = new CacheFactory();
        cacheFactory.setUp({
            redisUrl: 'redis://localhost:6379', // required (see docker-compose.yml)
            store: CACHE_STORE.ALL
        });
        await cacheFactory.reset();

        const options: ICacheOptions = {
            ttl: CACHE_TTL.SEC,
        };

        const awesomeSyncFunction = (label: string, date = new Date()) => {
            return '>' + label + '>' + date.toISOString() + '>' + new Date().toISOString();
        };
        const awesomeAsyncFunction = async (label: string, date = new Date()) => {
            await sleep(1);
            return '...>' + label + '...>' + date.toISOString() + '>' + new Date().toISOString();
        };

        const sync1 = await cacheFactory.execute(options, awesomeSyncFunction, 'label1', new Date(1000));
        const async1 = await cacheFactory.execute(options, awesomeAsyncFunction, 'label1', new Date(1000));
        expect(sync1).contain('>label1>1970-01-01T00:00:01.000Z>');
        expect(async1).contain('...>label1...>1970-01-01T00:00:01.000Z>');

        // cached result
        expect(await cacheFactory.execute(options, awesomeSyncFunction, 'label1', new Date(1000))).eq(sync1);
        expect(await cacheFactory.execute(options, awesomeAsyncFunction, 'label1', new Date(1000))).eq(async1);

        // not cached result
        expect(await cacheFactory.execute(options, awesomeSyncFunction, 'label1')).not.eq(sync1);
        expect(await cacheFactory.execute(options, awesomeAsyncFunction, 'label1')).not.eq(async1);

        // cache expires
        await sleep(1200);
        expect(await cacheFactory.execute(options, awesomeSyncFunction, 'label1', new Date(1000))).not.eq(sync1);
        expect(await cacheFactory.execute(options, awesomeAsyncFunction, 'label1', new Date(1000))).not.eq(async1);

        // cache's ended
        await cacheFactory.release();
        expect(await cacheFactory.execute(options, awesomeSyncFunction, 'label1', new Date(1000))).not.eq(sync1);
        expect(await cacheFactory.execute(options, awesomeAsyncFunction, 'label1', new Date(1000))).not.eq(sync1);

        expect(cacheFactory.isOk()).eq(true);
    });


    it('should incr', async () => {

        const cacheFactory = new CacheFactory();
        cacheFactory.setUp({
            redisUrl: 'redis://localhost:6379', // not required
        });
        await cacheFactory.reset();

        expect(await cacheFactory.incr('testIncr')).eq(0);
        expect(await cacheFactory.incr('testIncr')).eq(1);
        expect(await cacheFactory.incr('testIncr')).eq(2);

        // cache should not expire
        await sleep(1200);
        expect(await cacheFactory.incr('testIncr')).eq(3);
    });


});
