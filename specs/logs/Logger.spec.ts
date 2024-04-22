import {loggerFactory, LoggerLevels, LoggerPerf} from '../../src';
import {promisify} from 'util';
import {expect} from 'chai';

const sleep = promisify(setTimeout);

describe('Logger', () => {

    let perfLogger: LoggerPerf;

    before(() => {
        loggerFactory.setUp(true, LoggerLevels.DEBUG, LoggerLevels.DEBUG);
        perfLogger = loggerFactory.getPerfLogger('Logger');
    });

    it('should log info', async () => {
        loggerFactory.setUp(true, LoggerLevels.DEBUG, LoggerLevels.WARN);
        const done = loggerFactory.getLogger().info('test1', 'test2', 123);
        expect(!!done).eq(true);
    });

    it('should not log info..', async () => {
        loggerFactory.setUp(true, LoggerLevels.ERROR, LoggerLevels.ERROR);
        const done = loggerFactory.getLogger().info('test1', 'test2', 123);
        expect(!!done).eq(false);
    });

    it('should push as direct', async () => {
        perfLogger.inspectBegin('sleep');
        await sleep(1000);
        const timeSpent = perfLogger.inspectEnd('sleep');
    });
});
