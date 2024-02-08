import {expect} from 'chai';
import {configurationFactory} from '../../src';

describe('Configuration', function () {

    before(() => {
    });

    beforeEach(() => {
    });

    afterEach(() => {
    });

    it('should create one default configuration', async () => {
        let configuration = configurationFactory.getConfiguration();
        expect(configuration.getJSON()).equal('{}');
    });

    it('should create one setUpped configuration', async () => {
        configurationFactory.setUp(
            [{key: 'test', value: 'testValue'}],
            [{domain: 'domain1', keys: ['test']}]);

        let configuration = configurationFactory.getConfiguration();
        expect(configuration.getJSON()).equal('{"test":"testValue"}');
    });

    it('should override configuration', async () => {
        configurationFactory.setUp(
            [{key: 'test', value: 'testValue'}],
            [{domain: 'domain1', keys: ['test']}]);

        let configuration = configurationFactory.getConfiguration({'test': 'overridden'} as any);
        expect(configuration.getJSON()).equal('{"test":"overridden"}');
    });

});

