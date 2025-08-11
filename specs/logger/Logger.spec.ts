import {loggerFactory, LoggerLevels} from '../../src';
import {promisify} from 'util';
import {expect} from 'chai';

const sleep = promisify(setTimeout);

describe('Logger', () => {
    beforeEach(() => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.DEBUG});
    });

    it('should log info', async () => {
        loggerFactory.setUp({logLevel: LoggerLevels.WARN});
        const done = loggerFactory.getLogger().info('test1', 'test2', 123);
        expect(done).eq(true);
    });

    it('should log warn & error, with a hot label', async () => {
        loggerFactory.setUp({logLevel: LoggerLevels.WARN});
        let done = loggerFactory.getLogger().error(321, 'test2');
        expect(done).eq(true);
        loggerFactory.setUp({label: 'Hot'});
        done = loggerFactory.getLogger().warn(321, 'test3');
        expect(done).eq(true);
        done = loggerFactory.getLogger().log(LoggerLevels.ERROR, 321, 'test4');
        expect(done).eq(true);
    });

    it('should not log if level is higher', async () => {
        loggerFactory.setUp({consoleLevel: LoggerLevels.WARN, logLevel: LoggerLevels.ERROR});
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

    it('should log perf using another label', async () => {
        loggerFactory.setUp({label: 'Perf Monitoring'});
        const testPerfLogger = loggerFactory.getPerfLogger('Logger');
        testPerfLogger.inspectBegin('sleep');
        await sleep(1000);
        const timeSpent = testPerfLogger.inspectEnd('sleep');
    });
});
