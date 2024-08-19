import {loggerFactory} from '../logs';
import {QueueLauncher} from './QueueLauncher';
import {AbstractWorkerProcessor} from './AbstractWorkerProcessor';
import {IWorkerParams} from './IWorkerParams';
import {IWorkerData} from './IWorkerData';
import {QueueConcurrency} from './QueueConcurrency';
import {AbstractWorkerStore} from './AbstractWorkerStore';
import {DefaultWorkerStore} from './DefaultWorkerStore';

export enum STRATEGIES {
    DIRECT = 'direct',
    QUEUE = 'queue',
    THREAD = 'thread',
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_POLLING_MS = 500;

export class Launcher {
    private readonly queueLauncher: QueueLauncher;

    private readonly directWorker: any;

    constructor(protected options: {
                    workerProcessorPathFile: string,
                    workerStore?: AbstractWorkerStore,
                    threadStrategy?: string,
                    queueConcurrency?: QueueConcurrency,
                    pollingTimeInMilliSec?: number,
                    disablePolling?: boolean,
                }
    ) {

        if (!this.options.workerStore) {
            this.options.workerStore = new DefaultWorkerStore();
        }
        if (!this.options.threadStrategy) {
            this.options.threadStrategy = STRATEGIES.DIRECT;
        }
        if (!this.options.queueConcurrency) {
            this.options.queueConcurrency = {default: DEFAULT_CONCURRENCY, keys: []};
        }
        if (!this.options.pollingTimeInMilliSec) {
            this.options.pollingTimeInMilliSec = DEFAULT_POLLING_MS;
        }
        if (!this.options.disablePolling) {
            this.options.disablePolling = false;
        }

        if (!this.options.disablePolling) {
            this.directWorker = require('./asDirect');
        }

        let threadWorker = null;
        if (this.options.threadStrategy === STRATEGIES.QUEUE) {
            threadWorker = require('./asThreadWorker');

            this.queueLauncher = new QueueLauncher(this.directWorker, threadWorker, loggerFactory.getLogger(), this.options as {
                workerProcessorPathFile: string,
                workerStore: AbstractWorkerStore,
                queueConcurrency: QueueConcurrency,
                pollingTimeInMilliSec: number,
                disablePolling: boolean,
            });
        }
    }

    async push(workerProcesses: string[],
               workerData: IWorkerData,
               workerInstance: string = ''): Promise<boolean> {

        if (await this.getQueueRunningSize() === 0) {
            await this.resume();
        }

        const params: IWorkerParams = {
            workerProcesses,
            workerInstance,
            workerData,
            workerProcessorPathFile: this.options.workerProcessorPathFile,
        };
        // loggerFactory.getLogger().info('Launcher.push:', JSON.stringify(params));

        try {
            if (this.queueLauncher) {
                await this.queueLauncher.add(params);
            } else if (this.options.threadStrategy === STRATEGIES.THREAD) {
                const path = require('node:path');
                const {Worker} = require('worker_threads');
                const newWorker = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
            } else if (this.directWorker) {
                await this.directWorker(params, (e) => {
                    console.log('### TO_REMOVE finished', e);
                }, (error) => {
                    console.log('### TO_REMOVE needRetry?', error);
                });
            }
            return true;
        } catch (err) {
            loggerFactory.getLogger().error(err);
        }

        return false;
    }

    async getStoreWaitingSize() {
        try {
            return this.options.workerStore.size({inProgress: false});
        } catch (e) {
            this.queueLauncher?.clean();
            return 0;
        }
    }

    async getStoreRunningSize() {
        try {
            return this.options.workerStore.size({inProgress: true});
        } catch (e) {
            this.queueLauncher?.clean();
            return 0;
        }
    }

    async getQueueRunningSize() {
        if (!this.queueLauncher) {
            return this.getStoreRunningSize();
        }

        return this.queueLauncher.checkAndGetQueueRunningSize();
    }

    async getStats() {


        return [{
            queueName: 'todo',
            storeWaitingSize: await this.getStoreWaitingSize(),
            storeRunningSize: await this.getStoreRunningSize(),
            queueRunningSize: await this.getQueueRunningSize(),
        }];
    }

    async stop() {
        this.queueLauncher?.stopAll();
        AbstractWorkerProcessor.ForceStop();
        return true;
    }

    async resume() {
        this.queueLauncher?.stopAll(false);
        AbstractWorkerProcessor.ForceStop(false);
        return true;
    }
}
