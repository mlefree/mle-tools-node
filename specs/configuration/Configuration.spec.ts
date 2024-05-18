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
                    key: 'test2', value: 2,
                }
            ],
            []);
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":2}');

        const conf = configuration.getConf();
        expect(conf.test2).equal(2);

        // change existing key
        conf.test2 = {
            subs: [{id: '21'}],
        };

        // new key
        conf.test3 = {
            subs: [{id: '31'}],
        };

        configuration.merge(conf);
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"subs":[{"id":"21"}]},"test3":{"subs":[{"id":"31"}]}}');

        configuration.set('test3', {other: {subs: [4]}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"subs":[{"id":"21"}]},"test3":{"other":{"subs":[4]}}}');

        configuration.add('test3', {other: {disable: true}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"subs":[{"id":"21"}]},"test3":{"other":{"subs":[4],"disable":true}}}');

        configuration.add('test3', {other: {disable: false, sub2: [1, 2]}});
        expect(configuration.getJSON()).equal('{"test1":{"subs":[{"id":"1"},{"id":"2"},{"id":"3"}]},"test2":{"subs":[{"id":"21"}]},"test3":{"other":{"subs":[4],"disable":false,"sub2":[1,2]}}}');

    });

});
