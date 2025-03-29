import {DefaultWorkerStore, IWorkerData, Launcher, loggerFactory, LoggerLevels, LoggerPerf, QueueConcurrency, STRATEGIES} from '../../src';
import {expect} from 'chai';
import {promisify} from 'util';
import {Config, Input} from './WorkerProcessorA';
import {WorkerStore} from './WorkerStore';
import {join} from 'node:path';

const sleep = promisify(setTimeout);

describe('Launcher', () => {
    let logger: LoggerPerf;
    const parentPath = join(__dirname, '/../../');

    const trackStart = async (test: any) => {
        const title = test?.test?.title;
        loggerFactory.getLogger().info(`### TEST "${title}" starting...`);
        // await sleep(500);
        // loggerFactory.getLogger().info(`### TEST "${title}" ready...`);
        return logger.inspectBegin(title);
    };

    const trackFinish = async (test: any) => {
        const title = test?.test?.title;
        const timeSpent = logger.inspectEnd(title);
        await sleep(500);
        loggerFactory.getLogger().info(`### TEST "${title}" finishing...`);
        return timeSpent;
    };

    before(async () => {
        loggerFactory.setUp(true, LoggerLevels.DEBUG, LoggerLevels.DEBUG);
        await loggerFactory.getLogger().erase(parentPath);
        logger = loggerFactory.getPerfLogger('Launcher');
    });

    it('should push as direct', async function () {
        await trackStart(this);

        const input: Input = {count: 10};
        const config: Config = {time: 100, label: 'direct', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA'
        });
        const done = await launcher.push(['info', 'sleep', 'info'], data);

        const timeSpent = await trackFinish(this);
        expect(done).eq(true);
        expect(timeSpent).greaterThan(1000);
    }).timeout(4000);

    it('should push as thread (in ts)', async function () {
        await trackStart(this);

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore: new WorkerStore(),
            threadStrategy: STRATEGIES.THREAD
        });
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'thread', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push(['info', 'sleep'], data);

        const timeSpent = await trackFinish(this);
        await sleep(3000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('thread') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(2, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('info => ,thread') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep => ,thread') > 0).eq(true, lastLogs.toString());

    }).timeout(10000);

    it('should push as thread (in js)', async function () {
        await trackStart(this);

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorB',
            workerStore: new WorkerStore(),
            threadStrategy: STRATEGIES.THREAD
        });
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'thread', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push(['info', 'sleep'], data);

        const timeSpent = await trackFinish(this);
        await sleep(3000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('thread') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(2, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('infoB => ,thread') > 0).eq(true, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleepB => ,thread') > 0).eq(true, lastLogs.toString());

    }).timeout(10000);

    it('should push as queue', async function () {
        await trackStart(this);

        const queueConcurrency: QueueConcurrency = {
            default: 1,
            keys: [
                {contains: 'info', concurrency: 2},
                {contains: '"count":2', concurrency: 3},
            ]
        }
        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            queueConcurrency,
            pollingTimeInMilliSec: 100
        });
        const input: Input = {count: 2};
        const config: Config = {time: 11, label: 'queue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};

        // 5 launching (- 1 dup)
        let launched = await launcher.push(['info', 'sleep', 'info', 'sleep'], data);
        launched = await launcher.push(['info', 'sleep', 'info', 'sleep'], data); // Duplicate, should not be considered
        launched = await launcher.push(['info', 'sleep', 'info'], data);
        launched = await launcher.push(['info', 'sleep', 'sleep'], data);
        launched = await launcher.push(['info', 'sleep', 'sleep', 'info'], data);
        expect(launched).eq(true);
        expect(await launcher.getStoreWaitingSize()).equal(4);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        // await sleep(400000);
        const timeSpent = await trackFinish(this);
        expect(timeSpent).lessThan(1000);

        // In progress
        await sleep(1000);
        expect(await launcher.getStoreWaitingSize()).equal(0);
        expect(await launcher.getStoreRunningSize()).equal(4);
        expect(await launcher.getQueueRunningSize()).equal(4);
        await sleep(7000);
        expect(await launcher.getStoreWaitingSize()).equal(0);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('queue') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(5, lastLogs.toString());
        // expect(relatedLogs[relatedLogs.length - 3].indexOf('info,queue') > 0).eq(true, lastLogs.toString());
        // expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep,queue') > 0).eq(true, lastLogs.toString());
    }).timeout(100000);

    it('should push as queue and Fail', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE
        });
        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'failingQueue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push(['sleep', 'fail'], data);

        const timeSpent = await trackFinish(this);

        expect(await launcher.getStoreWaitingSize()).equal(0);
        expect(await launcher.getStoreRunningSize()).equal(1);
        expect(await launcher.getQueueRunningSize()).equal(1);
        await sleep(4000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getStoreWaitingSize()).equal(0);
        expect(await launcher.getStoreRunningSize()).equal(1);
        expect(await launcher.getQueueRunningSize()).equal(1);

        workerStore.removeAll();
        await sleep(8000);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('fail') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('fail') > 0).eq(true, relatedLogs.toString());
    }).timeout(20000);

    it('should push as queue and Throw Error', async function () {
        await trackStart(this);
        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA', workerStore,
            threadStrategy: STRATEGIES.QUEUE
        });
        const input: Input = {count: 1};
        const config: Config = {time: 7, label: 'throwQueue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push(['sleep', 'throwError'], data);

        const timeSpent = await trackFinish(this);
        await sleep(4000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getStoreWaitingSize()).equal(0);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('throw') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('throw') > 0).eq(true, relatedLogs.toString());
    }).timeout(10000);

    it('should push as queue and could stop', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA', workerStore,
            threadStrategy: STRATEGIES.QUEUE
        });
        const input: Input = {count: 2};
        let launchedCount = 0;
        for (let count = 1; count <= 1000; count++) {
            const config: Config = {time: count, label: 'toStopQueue' + count, logLevel: LoggerLevels.DEBUG};
            const data: IWorkerData = {input, config};
            const launched = await launcher.push(['info', 'sleep', 'info', 'sleep'], data);
            if (launched) launchedCount++;
        }

        expect(await launcher.getStoreWaitingSize()).equal(1000);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);
        for (let count = 0; count <= 20; count++) {
            console.log(JSON.stringify(await launcher.getStats()));
            // process.stdout.write('\r' + JSON.stringify(await launcher.getStats()));
            await sleep(100);
        }

        expect(launchedCount).eq(1000);
        const waiting = await launcher.getStoreWaitingSize();
        expect(waiting).lessThan(1000);
        expect(await launcher.getStoreRunningSize()).greaterThan(0);
        expect(await launcher.getQueueRunningSize()).greaterThan(0);

        // Stop !
        const stopped = await launcher.stop();
        await sleep(15000);
        expect(stopped).eq(true);
        expect(await launcher.getStoreWaitingSize()).equal(waiting);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        await trackFinish(this);
    }).timeout(20000);

    it('should push as queue and disable', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            disablePolling: true, // disabled
        });
        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'justPushedButNotPolled', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push(['sleep', 'info'], data);

        const timeSpent = await trackFinish(this);

        expect(await launcher.getStoreWaitingSize()).equal(1);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);
        await sleep(1000);

        expect(launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getStoreWaitingSize()).equal(1);
        expect(await launcher.getStoreRunningSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.getLogger().readLastLogs(parentPath);
        const relatedLogs = lastLogs
            .filter(l => l.indexOf('justPushedButNotPolled') > 0);
        expect(relatedLogs.length).eq(0);
    }).timeout(10000);
});
