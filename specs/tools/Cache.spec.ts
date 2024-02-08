import {expect} from 'chai';
import {Cache} from '../../src';

xdescribe('Cache', function () {

    before(() => {
    });

    beforeEach(() => {
    });

    afterEach(() => {
    });

    it('should cache model find and save', async () => {

        const mockedInstance = {
            id: 'mockedId',
            save: async () => {
            }
        };

        const mockedModel = {
            modelName: 'test',
            find: (condition: any) => {
                const cs = JSON.stringify(condition);
                return {
                    cache: () => {
                        return {
                            exec: (callback) => {
                                callback(null, new Array(cs.length).fill(mockedInstance));
                            }
                        };
                    },
                    exec: (callback: Function) => {
                        callback(null, new Array(cs.length).fill(mockedInstance));
                    }
                };
            }
        };

        let cache = new Cache();
        let results = await cache.cacheFind(mockedModel, {test: 1});
        expect(results.length).equal(10);

        let instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {test: 1});
        instanceSaved.id.should.equal('mockedId');
        mockedInstance.id = 'anotherOne';
        instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {test: 1});
        instanceSaved.id.should.equal('anotherOne');
        instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {});
        instanceSaved.id.should.equal('anotherOne');

        let count = await cache.resolve();
        count.should.equal(11);
    });

    it('should cache model find and save with unique', async () => {

        const mockedInstance = {
            id: 'mockedId',
            save: async () => {
            }
        };

        const mockedModel = {
            modelName: 'test',
            find: (condition) => {
                const cs = JSON.stringify(condition);
                return {
                    cache: () => {
                        return {
                            exec: (callback) => {
                                callback(null, new Array(cs.length).fill(mockedInstance));
                            }
                        };
                    },
                    exec: (callback) => {
                        callback(null, new Array(cs.length).fill(mockedInstance));
                    }
                };
            }
        };

        let cache = new Cache();
        let results = await cache.cacheFind(mockedModel, {test: 1});
        results.length.should.equal(10);

        let instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {test: 1}, true);
        instanceSaved.id.should.equal('mockedId');
        mockedInstance.id = 'anotherOne';
        instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {test: 1}, true);
        instanceSaved.id.should.equal('anotherOne');
        instanceSaved = await cache.cacheSave(mockedModel, mockedInstance, {}, true);
        instanceSaved.id.should.equal('anotherOne');

        let count = await cache.resolve();
        count.should.equal(2);
    });

});

