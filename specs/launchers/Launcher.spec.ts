import {IWorkerData, Launcher, LEVELS, loggerFactory, LoggerPerf, STRATEGIES} from '../../src';
import {expect} from 'chai';
import {promisify} from 'util';
import {Config, Input} from './WorkerProcessor';
import {QueueConcurrency} from '../../src/launchers/QueueLauncher';

const sleep = promisify(setTimeout);

describe('Launcher', () => {
    let logger: LoggerPerf;

    before(() => {
        loggerFactory.setUp(true, LEVELS.DEBUG, LEVELS.DEBUG);
        logger = loggerFactory.getPerfLogger('Launcher');
    });

    it('should push as direct', async () => {
        logger.inspectBegin('direct');
        const input: Input = {count: 10};
        const config: Config = {time: 100, label: 'direct', logLevel: LEVELS.DEBUG};
        const data: IWorkerData = {input, config};
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.DIRECT);
        const done = await launcher.push('info-sleep-info', data);

        const timeSpent = logger.inspectEnd('direct');
        expect(done).eq(true);
        expect(timeSpent).greaterThan(1000);
    });

    it('should push as thread', async () => {
        logger.inspectBegin('thread');
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.THREAD);
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'thread', logLevel: LEVELS.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push('info-sleep', data);
        const timeSpent = logger.inspectEnd('thread');

        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('thread') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(3, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('info,thread') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep,thread') > 0).eq(true, lastLogs.toString());

    });

    it('should push as queue', async () => {
        logger.inspectBegin('queue');
        const queueConcurrency: QueueConcurrency = {
            default: 1,
            keys: [{contains: 'info', concurrency: 2}, {contains: '"count":2', concurrency: 3},]
        }
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.QUEUE, queueConcurrency);
        const input: Input = {count: 2};
        const config: Config = {time: 11, label: 'queue', logLevel: LEVELS.DEBUG};
        const data: IWorkerData = {input, config};

        // 5 launching
        let launched = await launcher.push('info-sleep-info-sleep', data);
        launched = await launcher.push('info-sleep-info-sleep', data);
        launched = await launcher.push('info-sleep-info-sleep', data);
        launched = await launcher.push('info-sleep-info-sleep', data);
        launched = await launcher.push('info-sleep-info-sleep', data);
        expect(launched).eq(true);

        const timeSpent = logger.inspectEnd('queue');
        expect(timeSpent).lessThan(1000);

        // In progress
        await sleep(700);
        expect(launcher.getQueueSize()).greaterThanOrEqual(3); // could be 4 or 5, it depends on when :-/
        await sleep(700);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('queue') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(5, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 4].indexOf('info,queue') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 3].indexOf('sleep,queue') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('info,queue') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep,queue') > 0).eq(true, lastLogs.toString());
    });

    it('should push as queue and Fail', async () => {
        logger.inspectBegin('failingQueue');
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.QUEUE);
        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'failingQueue', logLevel: LEVELS.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push('sleep-fail', data);
        const timeSpent = logger.inspectEnd('failingQueue');

        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('fail') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('fail') > 0).eq(true, relatedLogs.toString());
    });

    it('should push as queue and Throw Error', async () => {
        logger.inspectBegin('throwQueue');
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.QUEUE);
        const input: Input = {count: 1};
        const config: Config = {time: 7, label: 'throwQueue', logLevel: LEVELS.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push('sleep-throwError', data);
        const timeSpent = logger.inspectEnd('throwQueue');

        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('throw') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('throw') > 0).eq(true, relatedLogs.toString());
    });

    it('should push as queue and could interrupt', async () => {
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', STRATEGIES.QUEUE);
        const input: Input = {count: 2};
        let launchedCount = 0;
        for (let count = 1; count <= 1000; count++) {
            const config: Config = {time: count, label: 'toStopQueue' + count, logLevel: LEVELS.DEBUG};
            const data: IWorkerData = {input, config};
            const launched = await launcher.push('info-sleep-info-sleep', data);
            if (launched) launchedCount++;
        }
        expect(launchedCount).eq(1000);
        expect(launcher.getQueueSize()).eq(1000);

        // Stoooop
        const stopped = await launcher.stop();
        expect(stopped).eq(true);
        expect(launcher.getQueueSize()).eq(0);
        await sleep(1500);
    });
});
