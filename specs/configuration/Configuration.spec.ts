import {expect} from 'chai';
import {Configuration, configurationFactory} from '../../src';

describe('Configuration', () => {

    before(() => {
    });

    beforeEach(() => {
    });

    afterEach(() => {
    });

    it('should create one default configuration', async () => {
        const configuration = configurationFactory.getConfiguration();
        expect(configuration.getJSON()).equal('{}');
    });

    it('should create one setUpped configuration', async () => {
        configurationFactory.setUp(
            [{key: 'test', value: 'testValue'}],
            [{domain: 'domain1', keys: ['test']}]);

        const configuration = configurationFactory.getConfiguration();
        expect(configuration.getJSON()).equal('{"test":"testValue"}');
    });

    it('should override configuration', async () => {
        configurationFactory.setUp(
            [{key: 'test', value: 'testValue'}],
            [{domain: 'domain1', keys: ['test']}]);

        const configuration = configurationFactory.getConfiguration({test: 'overridden'} as any);
        expect(configuration.getJSON()).equal('{"test":"overridden"}');
    });

    it('should create a simple configuration and merge/set/add it iteratively', async () => {
        const configuration = new Configuration([
                {
                    key: 'test1', value: {
                        subs: [{id: '1'}, {id: '2'}, {id: '3'}],
                    }
                },
                {
                    key: 'test2', value: {sub1: [1, 2, 3]},
                }
            ],
            []);
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"sub1":[1,2,3]}}');

        const conf = JSON.parse(JSON.stringify(configuration.getConf()));
        expect(conf.test2.sub1[2]).equal(3);

        // merging existing key
        conf.test2 = {
            sub2: [{id: '21'}],
        };

        // new key
        conf.test3 = {
            subs: [{id: '31'}],
        };

        configuration.merge(conf);
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"sub1":[1,2,3],"sub2":[{"id":"21"}]},"test3":{"subs":[{"id":"31"}]}}');

        configuration.set('test3', {other: {subs: [4]}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"sub1":[1,2,3],"sub2":[{"id":"21"}]},"test3":{"other":{"subs":[4]}}}');

        configuration.add('test3', {other: {disable: true}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"sub1":[1,2,3],"sub2":[{"id":"21"}]},"test3":{"other":{"subs":[4],"disable":true}}}');

        configuration.add('test3', {other: {disable: false, sub2: [1, 2]}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"sub1":[1,2,3],"sub2":[{"id":"21"}]},"test3":{"other":{"subs":[4],"disable":false,"sub2":[1,2]}}}');

    });

    it('should merge/set/add configuration with stringified json', async () => {
        const defaultJson = JSON.stringify({test1: 123});
        const configuration = new Configuration([], [], defaultJson);
        expect(configuration.getJSON()).equal('{"test1":123}');

        const conf = JSON.parse(JSON.stringify(configuration.getConf()));
        expect(conf.test1).equal(123);

        // new key
        const toMerge = JSON.stringify({test2: {subs: [{id: '21'}]}});
        configuration.merge(toMerge);
        expect(configuration.getJSON()).equal('{"test1":123,"test2":{"subs":[{"id":"21"}]}}');

    });

});
