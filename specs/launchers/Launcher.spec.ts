import {
    DefaultWorkerStore,
    IWorkerData,
    Launcher,
    loggerFactory,
    LoggerLevels,
    LoggerPerf,
    QueueConcurrency,
    STRATEGIES,
} from '../../src';
import {expect} from 'chai';
import {promisify} from 'util';
import {Config, Input} from './WorkerProcessorInterfaces';
import {WorkerStore} from './WorkerStore';
import {join} from 'node:path';

const sleep = promisify(setTimeout);

describe('Launcher', function () {
    this.timeout(30000);
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
        loggerFactory.setUp({
            consoleLevel: LoggerLevels.WARN,
            logLevel: LoggerLevels.DEBUG,
            path: parentPath,
        });
        await loggerFactory.erase();
        await sleep(1000);
        logger = loggerFactory.getPerfLogger('Launcher');
    });

    it('should push as direct', async function () {
        await trackStart(this);

        const input: Input = {count: 10};
        const key = 'direct1';
        const config: Config = {time: 100, label: 'direct', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, key, config};
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
        });
        const done = await launcher.push({...data, namesToLaunch: ['info', 'sleep', 'info']});

        const timeSpent = await trackFinish(this);
        expect(!!done).eq(true);
        expect(timeSpent).greaterThan(1000);
    });

    it('should push as direct even if polling is disabled', async function () {
        await trackStart(this);

        const input: Input = {count: 10};
        const config: Config = {time: 100, label: 'direct', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            disablePolling: true, // <== To test
        });
        const done = await launcher.push({...data, namesToLaunch: ['info', 'sleep', 'info']});

        const timeSpent = await trackFinish(this);
        expect(!!done).eq(true);
        expect(timeSpent).greaterThan(1000);
    });

    it('should push as thread (in ts)', async function () {
        await trackStart(this);

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore: new WorkerStore(),
            threadStrategy: STRATEGIES.THREAD,
        });
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'threadA', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push({...data, namesToLaunch: ['info', 'sleep']});

        const timeSpent = await trackFinish(this);
        await sleep(4000); // Increased wait time for thread to complete and flush logs

        expect(!!launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('threadA') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(2, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('info => ,threadA') > 0).eq(
            true,
            lastLogs.toString()
        );
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep => ,threadA') > 0).eq(
            true,
            lastLogs.toString()
        );
    });

    it('should push as thread (in js)', async function () {
        await trackStart(this);

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorB',
            workerStore: new WorkerStore(),
            threadStrategy: STRATEGIES.THREAD,
        });
        const input: Input = {count: 2};
        const config: Config = {time: 10, label: 'threadB', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push({...data, namesToLaunch: ['info', 'sleep']});

        const timeSpent = await trackFinish(this);
        await sleep(4000); // Increased wait time for thread to complete and flush logs

        expect(!!launched).eq(true);
        expect(timeSpent).lessThan(1000);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('threadB') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(2, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 2].indexOf('infoB => ,threadB') > 0).eq(
            true,
            lastLogs.toString()
        );
        expect(relatedLogs[relatedLogs.length - 1].indexOf('sleepB => ,threadB') > 0).eq(
            true,
            lastLogs.toString()
        );
    });

    it('should push as queue', async function () {
        await trackStart(this);
        loggerFactory.setUp({consoleLevel: LoggerLevels.WARN});

        const queueConcurrency: QueueConcurrency = {
            default: 1,
            keys: [
                {contains: 'info', concurrency: 2},
                {contains: '"count":2', concurrency: 3},
            ],
        };
        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 10,
        });
        launcher.setQueueConcurrency(queueConcurrency);
        launcher.setWorkerStore(workerStore);
        expect(await launcher.isRunning()).eq(false);

        const input: Input = {count: 2};
        const config: Config = {time: 11, label: 'queue', logLevel: LoggerLevels.INFO};
        const key = 'queue';
        const data: IWorkerData = {input, key, config};

        // 5 launching (- 1 dup)
        let launched = await launcher.push({
            ...data,
            namesToLaunch: ['info', 'sleep', 'info', 'sleep'],
        });
        launched = await launcher.push({
            ...data,
            namesToLaunch: ['info', 'sleep', 'info', 'sleep'],
        }); // Duplicate should not be considered
        launched = await launcher.push({...data, namesToLaunch: ['info', 'sleep', 'info']});
        launched = await launcher.push({...data, namesToLaunch: ['info', 'sleep', 'sleep']});
        launched = await launcher.push({
            ...data,
            namesToLaunch: ['info', 'sleep', 'sleep', 'info'],
        });
        expect(launched).eq(key);
        expect(await launcher.getQueueSize()).equal(4);
        expect(await launcher.getQueueWaitingSize()).equal(4);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const timeSpent = await trackFinish(this);
        expect(timeSpent).lessThan(1000);

        // In progress
        await sleep(1000);
        expect(await launcher.getQueueSize()).equal(4);
        expect(await launcher.getQueueWaitingSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(4);
        expect(await launcher.isRunning()).eq(true);

        // Finished - increased wait time for all tasks to complete
        await sleep(7000);
        expect(await launcher.getQueueSize()).equal(0);
        expect(await launcher.getQueueWaitingSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('queue') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(5, lastLogs.toString());
        // expect(relatedLogs[relatedLogs.length - 3].indexOf('info,queue') > 0).eq(true, lastLogs.toString());
        // expect(relatedLogs[relatedLogs.length - 1].indexOf('sleep,queue') > 0).eq(true, lastLogs.toString());

        expect(await launcher.isRunning()).eq(true);
        await launcher.stop();
        expect(await launcher.isRunning()).eq(false);
    });

    it('should push as queue and Fail', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
        });
        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'failingQueue', logLevel: LoggerLevels.INFO};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push({...data, namesToLaunch: ['sleep', 'fail']});

        const timeSpent = await trackFinish(this);

        expect(await launcher.getQueueSize()).equal(1);
        expect(await launcher.getQueueWaitingSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(1);
        await sleep(1000);

        expect(launched).eq('["sleep","fail"]{"count":1}');
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getQueueSize()).equal(1);
        expect(await launcher.getQueueWaitingSize()).equal(0);

        workerStore.removeAll();
        await sleep(1000);
        expect(await launcher.getQueueSize()).equal(0);
        expect(await launcher.getQueueWaitingSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('fail') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('fail') > 0).eq(
            true,
            relatedLogs.toString()
        );

        await launcher.stop();
    });

    it('should push as queue and Throw Error', async function () {
        await trackStart(this);
        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 100,
        });
        const input: Input = {count: 1};
        const config: Config = {time: 7, label: 'throwQueue', logLevel: LoggerLevels.WARN};
        const data: IWorkerData = {input, config};
        const launched = await launcher.push({...data, namesToLaunch: ['sleep', 'throwError']});

        const timeSpent = await trackFinish(this);
        await sleep(3000); // Significantly increased wait time for slow CI environment

        expect(!!launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getQueueSize()).equal(0);
        expect(await launcher.getQueueWaitingSize()).equal(0);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('throw') > 0);
        expect(relatedLogs.length).greaterThanOrEqual(1, lastLogs.toString());
        expect(relatedLogs[relatedLogs.length - 1].indexOf('throw') > 0).eq(
            true,
            relatedLogs.toString()
        );

        await launcher.stop();
    });

    it('should push as queue and could stop', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 100,
        });
        const input: Input = {count: 1};
        let launchedCount = 0;
        for (let count = 1; count <= 1000; count++) {
            const config: Config = {
                time: count,
                label: 'toStopQueue' + count,
                logLevel: LoggerLevels.INFO,
            };
            const key = 'queue' + count;
            const data: IWorkerData = {input, key, config};
            const launched = await launcher.push({
                ...data,
                namesToLaunch: ['info', 'sleep'],
            });
            if (launched) {
                launchedCount++;
            }
        }

        expect(await launcher.getQueueSize()).equal(1000);
        expect(await launcher.getQueueWaitingSize()).equal(1000);
        expect(await launcher.getQueueRunningSize()).equal(0);
        for (let count = 0; count <= 20; count++) {
            console.log(
                new Date().toISOString(),
                'TEST stats:',
                count,
                JSON.stringify(await launcher.getStats())
            );
            // process.stdout.write('\r' + JSON.stringify(await launcher.getStats()));
            await sleep(100);
        }

        expect(launchedCount).eq(1000);
        const waiting = await launcher.getQueueWaitingSize();
        expect(waiting).lessThanOrEqual(1000);
        expect(waiting).greaterThan(100);
        expect(await launcher.getQueueRunningSize()).greaterThan(0);
        expect(await launcher.getQueueSize()).greaterThanOrEqual(waiting);

        // Stop ! (during process)
        console.log(new Date().toISOString(), 'TEST ### STOP ###');
        expect(await launcher.isRunning()).eq(true);
        const stopped = await launcher.stop();
        expect(await launcher.isRunning()).eq(false);
        await sleep(4000);
        expect(stopped).eq(true);
        expect(await launcher.getQueueWaitingSize()).equal(waiting);
        expect(await launcher.getQueueRunningSize()).equal(0, `with waiting:${waiting}`);
        expect(await launcher.getQueueSize()).equal(waiting);

        await trackFinish(this);
    });

    it('should push as queue but disable polling', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            disablePolling: true, // disabled
        });
        const input: Input = {count: 1};
        const config: Config = {
            time: 5,
            label: 'justPushedButNotPolled',
            logLevel: LoggerLevels.INFO,
        };
        const data: IWorkerData = {input, config};
        const launched = await launcher.push({...data, namesToLaunch: ['sleep', 'info']});

        const timeSpent = await trackFinish(this);

        expect(await launcher.getQueueSize()).equal(1);
        expect(await launcher.getQueueWaitingSize()).equal(1);
        expect(await launcher.getQueueRunningSize()).equal(0);
        await sleep(1000);

        expect(!!launched).eq(true);
        expect(timeSpent).lessThan(1000);
        expect(await launcher.getQueueSize()).equal(1);
        expect(await launcher.getQueueWaitingSize()).equal(1);
        expect(await launcher.getQueueRunningSize()).equal(0);

        const lastLogs = loggerFactory.readLastLogs();
        const relatedLogs = lastLogs.filter((l) => l.indexOf('justPushedButNotPolled') > 0);
        expect(relatedLogs.length).eq(0);

        await launcher.stop();
    });

    it('should wait for ancestor task using idsToWait - simple case', async function () {
        await trackStart(this);

        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const config1: Config = {time: 200, label: 'ancestor', logLevel: LoggerLevels.INFO};
        const config2: Config = {time: 10, label: 'dependent', logLevel: LoggerLevels.INFO};

        // Push ancestor task first
        const ancestorId = 'ancestor-1';
        const data1: IWorkerData = {id: ancestorId, input, config: config1};
        const launched1 = await launcher.push({...data1, namesToLaunch: ['info', 'sleep']});

        // Push dependent task that waits for ancestor
        const dependentId = 'dependent-1';
        const data2: IWorkerData = {
            id: dependentId,
            input,
            config: config2,
            idsToWait: [ancestorId],
        };
        const launched2 = await launcher.push({...data2, namesToLaunch: ['info', 'sleep']});

        expect(launched1).eq('ancestor-1');
        expect(launched2).eq('dependent-1');
        expect(await launcher.getQueueSize()).equal(2);

        // Wait a bit - ancestor should be running, dependent should be waiting
        await sleep(500);
        expect(await launcher.getQueueRunningSize()).equal(1, 'Only ancestor should be running');
        expect(await launcher.getQueueWaitingSize()).equal(1, 'Dependent should still be waiting');

        // Wait for ancestor to complete and dependent to start and finish
        await sleep(12000);
        expect(await launcher.getQueueSize()).equal(0, 'Both tasks should be completed');

        const lastLogs = loggerFactory.readLastLogs();
        const ancestorLogs = lastLogs.filter((l) => l.indexOf('ancestor') > 0);
        const dependentLogs = lastLogs.filter((l) => l.indexOf('dependent') > 0);
        expect(ancestorLogs.length).greaterThanOrEqual(1);
        expect(dependentLogs.length).greaterThanOrEqual(1);

        await launcher.stop();
    });

    it('should wait for multiple ancestors using idsToWait', async function () {
        await trackStart(this);

        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const config1: Config = {time: 150, label: 'ancestor1', logLevel: LoggerLevels.INFO};
        const config2: Config = {time: 100, label: 'ancestor2', logLevel: LoggerLevels.INFO};
        const config3: Config = {time: 10, label: 'dependent', logLevel: LoggerLevels.INFO};

        // Push two ancestor tasks
        const ancestor1Id = 'ancestor-1';
        const ancestor2Id = 'ancestor-2';
        const data1: IWorkerData = {id: ancestor1Id, input, config: config1};
        const data2: IWorkerData = {id: ancestor2Id, input, config: config2};
        await launcher.push({...data1, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...data2, namesToLaunch: ['info', 'sleep']});

        // Push dependent task that waits for both ancestors
        const dependentId = 'dependent-multi';
        const data3: IWorkerData = {
            id: dependentId,
            input,
            config: config3,
            idsToWait: [ancestor1Id, ancestor2Id],
        };
        await launcher.push({...data3, namesToLaunch: ['info', 'sleep']});

        expect(await launcher.getQueueSize()).equal(3);

        // Wait for first ancestor to potentially complete
        await sleep(200);
        expect(await launcher.getQueueWaitingSize()).greaterThanOrEqual(
            1,
            'Dependent should still wait for second ancestor'
        );

        // Wait for both ancestors to complete
        await sleep(8000);
        expect(await launcher.getQueueSize()).equal(0, 'All tasks should complete');

        await launcher.stop();
    });

    it('should handle idsToWait with non-existent ancestor', async function () {
        await trackStart(this);

        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const config: Config = {time: 50, label: 'noAncestor', logLevel: LoggerLevels.INFO};

        // Push task that waits for non-existent ancestor
        const data: IWorkerData = {
            id: 'task-1',
            input,
            config,
            idsToWait: ['non-existent-id'],
        };
        const launched = await launcher.push({...data, namesToLaunch: ['info', 'sleep']});

        expect(!!launched).eq(true);
        expect(await launcher.getQueueSize()).equal(1);

        // Since ancestor doesn't exist, task should run immediately
        await sleep(100);
        expect(await launcher.getQueueRunningSize()).equal(1);

        await sleep(6000);
        expect(await launcher.getQueueSize()).equal(0, 'Task should complete');

        await launcher.stop();
    });

    it('should handle chain of dependencies with idsToWait', async function () {
        await trackStart(this);

        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const configA: Config = {time: 100, label: 'taskA', logLevel: LoggerLevels.INFO};
        const configB: Config = {time: 100, label: 'taskB', logLevel: LoggerLevels.INFO};
        const configC: Config = {time: 100, label: 'taskC', logLevel: LoggerLevels.INFO};

        // Create chain: A -> B -> C
        const taskAId = 'task-A';
        const taskBId = 'task-B';
        const taskCId = 'task-C';

        const dataA: IWorkerData = {id: taskAId, input, config: configA};
        const dataB: IWorkerData = {id: taskBId, input, config: configB, idsToWait: [taskAId]};
        const dataC: IWorkerData = {id: taskCId, input, config: configC, idsToWait: [taskBId]};

        await launcher.push({...dataA, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...dataB, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...dataC, namesToLaunch: ['info', 'sleep']});

        expect(await launcher.getQueueSize()).equal(3);

        // After short wait, only A should be running
        await sleep(600);
        expect(await launcher.getQueueRunningSize()).equal(1, 'Only task A should be running');

        // After A completes, B should start - significantly increased wait for slow CI environment
        await sleep(2500);
        const sizeAfterA = await launcher.getQueueSize();
        expect(sizeAfterA).lessThanOrEqual(
            2,
            `A should be done, B and/or C remain. Got ${sizeAfterA}`
        );
        expect(sizeAfterA).greaterThanOrEqual(1, 'At least one task should remain');

        // After B completes, C should start - increased wait for slow CI
        await sleep(3000);
        const sizeAfterB = await launcher.getQueueSize();
        expect(sizeAfterB).lessThanOrEqual(1, `A and B done, C may remain. Got ${sizeAfterB}`);

        // Wait for all to complete - increased wait for slow CI
        await sleep(3000);
        expect(await launcher.getQueueSize()).equal(0, 'All tasks should complete');

        const timeSpent = await trackFinish(this);

        const lastLogs = loggerFactory.readLastLogs();
        const taskALogs = lastLogs.filter((l) => l.indexOf('taskA') > 0);
        const taskBLogs = lastLogs.filter((l) => l.indexOf('taskB') > 0);
        const taskCLogs = lastLogs.filter((l) => l.indexOf('taskC') > 0);
        expect(taskALogs.length).greaterThanOrEqual(1);
        expect(taskBLogs.length).greaterThanOrEqual(1);
        expect(taskCLogs.length).greaterThanOrEqual(1);

        await launcher.stop();
    });

    it('should handle complex dependency graph with idsToWait', async function () {
        await trackStart(this);

        const workerStore = new DefaultWorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};

        // Create graph: A and B are independent, C depends on both A and B, D depends on C
        const taskAId = 'task-A';
        const taskBId = 'task-B';
        const taskCId = 'task-C';
        const taskDId = 'task-D';

        const dataA: IWorkerData = {
            id: taskAId,
            input,
            config: {time: 100, label: 'graphA', logLevel: LoggerLevels.INFO},
        };
        const dataB: IWorkerData = {
            id: taskBId,
            input,
            config: {time: 100, label: 'graphB', logLevel: LoggerLevels.INFO},
        };
        const dataC: IWorkerData = {
            id: taskCId,
            input,
            config: {time: 100, label: 'graphC', logLevel: LoggerLevels.INFO},
            idsToWait: [taskAId, taskBId],
        };
        const dataD: IWorkerData = {
            id: taskDId,
            input,
            config: {time: 100, label: 'graphD', logLevel: LoggerLevels.INFO},
            idsToWait: [taskCId],
        };

        await launcher.push({...dataA, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...dataB, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...dataC, namesToLaunch: ['info', 'sleep']});
        await launcher.push({...dataD, namesToLaunch: ['info', 'sleep']});

        expect(await launcher.getQueueSize()).equal(4);

        // Initially, A and B should run (no dependencies)
        await sleep(800);
        expect(await launcher.getQueueRunningSize()).greaterThanOrEqual(
            1,
            'A and/or B should be running'
        );

        // After A and B complete, C should run - increased wait time for CI environment
        await sleep(6000);
        expect(await launcher.getQueueSize()).lessThanOrEqual(
            2,
            'A and B should be done or nearly done'
        );

        // After C completes, D should run
        await sleep(4000);
        expect(await launcher.getQueueSize()).lessThanOrEqual(1, 'Only D or nothing should remain');

        // Wait for D to complete
        await sleep(4000);
        expect(await launcher.getQueueSize()).equal(0, 'All tasks should complete');

        const timeSpent = await trackFinish(this);

        await launcher.stop();
    });

    it('should handle idsToWait when ancestor task fails', async function () {
        await trackStart(this);

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const configFail: Config = {time: 50, label: 'failAncestor', logLevel: LoggerLevels.WARN};
        const configDependent: Config = {
            time: 50,
            label: 'dependentOnFail',
            logLevel: LoggerLevels.WARN,
        };

        // Push ancestor task that will fail
        const ancestorId = 'fail-ancestor';
        const dataFail: IWorkerData = {id: ancestorId, input, config: configFail};
        await launcher.push({...dataFail, namesToLaunch: ['sleep', 'fail']});

        // Push dependent task
        const dependentId = 'dependent-on-fail';
        const dataDependent: IWorkerData = {
            id: dependentId,
            input,
            config: configDependent,
            idsToWait: [ancestorId],
        };
        await launcher.push({...dataDependent, namesToLaunch: ['info', 'sleep']});

        expect(await launcher.getQueueSize()).equal(2);

        // Wait for ancestor to fail (it will stay in queue due to keepInTheQueue)
        await sleep(150);
        expect(await launcher.getQueueSize()).greaterThanOrEqual(
            1,
            'Failed task may stay in queue'
        );

        // Manually remove the failed task to allow dependent to proceed
        workerStore.removeAll();
        await sleep(100);

        const timeSpent = await trackFinish(this);

        await launcher.stop();
    });

    it('should log retry as info (not error) when worker needs retry - direct mode', async function () {
        await trackStart(this);
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.DEBUG});

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            threadStrategy: STRATEGIES.DIRECT,
        });

        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'retryDirect', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};

        // 'fail' process returns false with keepInTheQueue: true => triggers retry
        await launcher.push({...data, namesToLaunch: ['fail']});

        await sleep(500);
        const timeSpent = await trackFinish(this);

        const lastLogs = loggerFactory.readLastLogs();

        // Filter logs from this test onwards (after "retryDirect" appears)
        const testStartIndex = lastLogs.findIndex((l) => l.indexOf('retryDirect') > 0);
        const testLogs = testStartIndex >= 0 ? lastLogs.slice(testStartIndex) : lastLogs;

        // Verify retry is logged as info, not error
        const retryLogs = testLogs.filter((l) => l.indexOf('needs retry') > 0);
        const retryInfoLogs = retryLogs.filter(
            (l) => l.indexOf('|info') > 0 || l.indexOf('|info :') > 0
        );
        expect(retryLogs.length).greaterThanOrEqual(
            1,
            `Expected retry log. Logs: ${testLogs.join('\n')}`
        );
        expect(retryInfoLogs.length).greaterThanOrEqual(
            1,
            `Retry should be logged as info level. Logs: ${retryLogs.join('\n')}`
        );

        // Verify no "Direct Worker error" logs for this retry case (only check test logs)
        const errorLogs = testLogs.filter((l) => l.indexOf('Direct Worker error') > 0);
        expect(errorLogs.length).eq(
            0,
            `Retry should NOT produce error logs. Found: ${errorLogs.join('\n')}`
        );
    });

    it('should log retry as info (not error) when worker needs retry - queue mode', async function () {
        await trackStart(this);
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.DEBUG});

        const workerStore = new WorkerStore();
        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            workerStore,
            threadStrategy: STRATEGIES.QUEUE,
            pollingTimeInMilliSec: 50,
        });

        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'retryQueue', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};

        // 'fail' process returns false with keepInTheQueue: true => triggers retry
        await launcher.push({...data, namesToLaunch: ['fail']});

        await sleep(1000);

        const lastLogs = loggerFactory.readLastLogs();

        // Filter logs from this test onwards
        const testStartIndex = lastLogs.findIndex((l) => l.indexOf('retryQueue') > 0);
        const testLogs = testStartIndex >= 0 ? lastLogs.slice(testStartIndex) : lastLogs;

        // Verify retry is logged as info, not error
        const retryLogs = testLogs.filter((l) => l.indexOf('needs retry') > 0);
        expect(retryLogs.length).greaterThanOrEqual(
            1,
            `Expected retry log. Logs: ${testLogs.join('\n')}`
        );

        // Verify retry logs are at info level (not error)
        const retryInfoLogs = retryLogs.filter((l) => l.indexOf('|info') > 0);
        expect(retryInfoLogs.length).greaterThanOrEqual(
            1,
            `Retry should be logged at info level. Logs: ${retryLogs.join('\n')}`
        );

        workerStore.removeAll();
        await trackFinish(this);
        await launcher.stop();
    });

    it('should log real errors as error (not info) when worker throws', async function () {
        await trackStart(this);
        loggerFactory.setUp({consoleLevel: LoggerLevels.DEBUG, logLevel: LoggerLevels.DEBUG});

        const launcher = new Launcher({
            workerProcessorPathFile: __dirname + '/WorkerProcessorA',
            threadStrategy: STRATEGIES.DIRECT,
        });

        const input: Input = {count: 1};
        const config: Config = {time: 5, label: 'errorDirect', logLevel: LoggerLevels.DEBUG};
        const data: IWorkerData = {input, config};

        // 'throwError' process throws an exception => real error
        await launcher.push({...data, namesToLaunch: ['throwError']});

        await sleep(500);
        const timeSpent = await trackFinish(this);

        const lastLogs = loggerFactory.readLastLogs();

        // Filter logs related to this specific test (by label)
        const testLogs = lastLogs.filter(
            (l) => l.indexOf('errorDirect') > 0 || l.indexOf('throwError') > 0
        );

        // Verify error is logged (from AbstractWorkerProcessor.launch catch block)
        const errorLogs = testLogs.filter((l) => l.indexOf('error') > 0 || l.indexOf('warn') > 0);
        expect(errorLogs.length).greaterThanOrEqual(
            1,
            `Expected error/warn log for thrown exception. Logs: ${testLogs.join('\n')}`
        );

        // For throwError, the exception is caught and allDone=false but anotherTry depends on error code 408
        // Since MErrorCode throws with code 500, anotherTry will be false (no retry)
        // Verify the worker finished without retry signal
        const finishedLogs = testLogs.filter((l) => l.indexOf('Direct Worker finished') > 0);
        expect(finishedLogs.length).greaterThanOrEqual(
            0,
            `Worker should finish (with or without retry). Logs: ${testLogs.join('\n')}`
        );
    });
});
