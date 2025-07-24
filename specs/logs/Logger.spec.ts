import {loggerFactory, LoggerLevels, LoggerPerf} from '../../src';
import {promisify} from 'util';
import {expect} from 'chai';

const sleep = promisify(setTimeout);

describe('Logger', () => {
    let perfLogger: LoggerPerf;

    before(() => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.DEBUG});
        perfLogger = loggerFactory.getPerfLogger('Logger');
    });

    it('should log info', async () => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.WARN});
        const done = loggerFactory.getLogger().info('test1', 'test2', 123);
        expect(done).eq(true);
    });

    it('should log error', async () => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.WARN});
        let done = loggerFactory.getLogger().error(321, 'test2');
        expect(done).eq(true);
        done = loggerFactory.getLogger().log(LoggerLevels.ERROR, 321, 'test2');
        expect(done).eq(true);
    });

    it('should not log info', async () => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.ERROR, logLevel: LoggerLevels.ERROR});
        const done = loggerFactory.getLogger().info('test1', 'test2', 123);
        expect(done).eq(false);
    });

    it('should filtered', async () => {
        let filters = {[LoggerLevels.WARN]: 'test'};
        loggerFactory.setUp({filters});
        let done = loggerFactory.getLogger().warn('1', '2test2', 123);
        expect(done).eq(false);
        done = loggerFactory.getLogger().warn('2test', 'whatever', 123);
        expect(done).eq(true);

        filters = {[LoggerLevels.WARN]: ''};
        loggerFactory.setUp({filters});
        done = loggerFactory.getLogger().warn('2test', 'whatever', 123);
        expect(done).eq(true);
    });

    it('should push as direct', async () => {
        perfLogger.inspectBegin('sleep');
        await sleep(1000);
        const timeSpent = perfLogger.inspectEnd('sleep');
    });
});
