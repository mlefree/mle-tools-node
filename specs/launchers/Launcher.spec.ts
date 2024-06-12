import {IWorkerData, Launcher, loggerFactory, LoggerLevels, LoggerPerf, QueueConcurrency, STRATEGIES} from '../../src';
import {expect} from 'chai';
import {promisify} from 'util';
import {Config, Input} from './WorkerProcessor';
import {WorkerStore} from './WorkerStore';
import {DefaultWorkerStore} from '../../src/launchers/DefaultWorkerStore';

const sleep = promisify(setTimeout);

describe('Launcher', () => {
    let logger: LoggerPerf;

    before(() => {
        loggerFactory.setUp(true, LoggerLevels.DEBUG, LoggerLevels.DEBUG);
        logger = loggerFactory.getPerfLogger('Launcher');
    });

    it('should push as direct', async () => {
        logger.inspectBegin('direct');
        const input: Input = {count: 10};
        const config: Config = {time: 100, label: 'direct', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts');
        const done = await launcher.push('info-sleep-info', data);

        const timeSpent = logger.inspectEnd('direct');
        expect(done).eq(true);
        expect(timeSpent).greaterThan(1000);
    });

    it('should push as thread', async () => {
        logger.inspectBegin('thread');
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', new WorkerStore(),
            STRATEGIES.THREAD);
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'thread', logLevel: LoggerLevels.DEBUG};
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
            keys: [
                {contains: 'info', concurrency: 2},
                {contains: '"count":2', concurrency: 3},
            ]
        }
        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', workerStore,
            STRATEGIES.QUEUE, queueConcurrency, 100);
        const input: Input = {count: 2};
        const config: Config = {time: 11, label: 'queue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};

        // 5 launching (- 1 dup)
        let launched = await launcher.push('info-sleep-info-sleep', data);
        launched = await launcher.push('info-sleep-info-sleep', data); // Duplicate, should not be considered
        launched = await launcher.push('info-sleep-info', data);
        launched = await launcher.push('info-sleep-sleep', data);
        launched = await launcher.push('info-sleep-sleep-info', data);
        expect(launched).eq(true);
        expect(launcher.getQueueWaitingSize()).equal(4);
        expect(await workerStore.size('"count":2')).equal(4);
        expect(await workerStore.size()).equal(4);

        // await sleep(70000000);
        const timeSpent = logger.inspectEnd('queue');
        expect(timeSpent).lessThan(1000);

        // In progress
        await sleep(700);
        expect(launcher.getQueueWaitingSize()).equal(1);
        expect(launcher.getQueueRunningSize()).equal(3);
        await sleep(2000);
        expect(launcher.getQueueWaitingSize()).equal(0);
        expect(launcher.getQueueRunningSize()).equal(0);
        expect(await workerStore.size('"count":2')).equal(0);
        expect(await workerStore.size()).equal(0);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('queue') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(5, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 3].indexOf('info,queue') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep,queue') > 0).eq(true, lastLogs.toString());
    }).timeout(5000000000);

    it('should push as queue and Fail', async () => {
        logger.inspectBegin('failingQueue');
        const workerStore = new WorkerStore();
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', workerStore,
            STRATEGIES.QUEUE);
        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'failingQueue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push('sleep-fail', data);
        const timeSpent = logger.inspectEnd('failingQueue');

        expect(launcher.getQueueWaitingSize()).equal(1);
        expect(await workerStore.size('sleep-fail')).equal(1);
        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(launcher.getQueueWaitingSize()).equal(0);
        expect(await workerStore.size('sleep-fail')).equal(1);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('fail') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('fail') > 0).eq(true, relatedLogs.toString());
    });

    it('should push as queue and Throw Error', async () => {
        logger.inspectBegin('throwQueue');
        const workerStore = new WorkerStore();
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', workerStore,
            STRATEGIES.QUEUE);
        const input: Input = {count: 1};
        const config: Config = {time: 7, label: 'throwQueue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push('sleep-throwError', data);
        const timeSpent = logger.inspectEnd('throwQueue');

        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(launcher.getQueueWaitingSize()).equal(0);
        expect(await workerStore.size('sleep-throwError')).equal(1);

        const lastLogs = loggerFactory.getLogger().readLastLogs(__dirname + '/../../');
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('throw') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('throw') > 0).eq(true, relatedLogs.toString());

        await sleep(2000);
    }).timeout(5000);

    it('should push as queue and could interrupt', async () => {
        const workerStore = new WorkerStore();
        const launcher = new Launcher(__dirname + '/WorkerProcessor.ts', workerStore,
            STRATEGIES.QUEUE);
        const input: Input = {count: 2};
        let launchedCount = 0;
        for (let count = 1; count <= 1000; count++) {
            const config: Config = {time: count, label: 'toStopQueue' + count, logLevel: LoggerLevels.DEBUG};
            const data: IWorkerData = {input, config};
            const launched = await launcher.push('info-sleep-info-sleep', data);
            if (launched) launchedCount++;
        }

        expect(await workerStore.size('info-sleep-info-sleep')).equal(1000);
        await sleep(2000);
        expect(launchedCount).eq(1000);
        const waiting = launcher.getQueueWaitingSize();
        expect(waiting).lessThan(1000);
        expect(launcher.getQueueRunningSize()).greaterThan(0);
        expect(await workerStore.size('info-sleep-info-sleep')).lessThan(1000);
        expect(await workerStore.size('info-sleep-info-sleep')).greaterThan(waiting);

        // Stop !
        const stopped = await launcher.stop();
        await sleep(2000);
        expect(stopped).eq(true);
        expect(launcher.getQueueWaitingSize()).eq(waiting);
        expect(launcher.getQueueRunningSize()).eq(0);
        expect(await workerStore.size('info-sleep-info-sleep')).equal(waiting);
        await sleep(1000);
    }).timeout(6000);
});
