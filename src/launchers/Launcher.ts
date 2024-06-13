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

const CONCURRENCY = 3;

export class Launcher {
    private readonly queueLauncher: QueueLauncher;

    private readonly directWorker: any;

    constructor(
        public workerProcessorPathFile: string,
        public workerStore: AbstractWorkerStore = new DefaultWorkerStore(),
        public threadStrategy: string = STRATEGIES.DIRECT,
        protected queueConcurrency: QueueConcurrency = {default: CONCURRENCY, keys: []},
        pollingTimeInMilliSec = 500,
    ) {
        this.directWorker = require('./asDirect');
        let threadWorker = null;

        if (this.threadStrategy === STRATEGIES.QUEUE) {
            threadWorker = require('./asThreadWorker');
            this.queueLauncher = new QueueLauncher(this.directWorker, threadWorker,
                loggerFactory, this.queueConcurrency, this.workerStore, pollingTimeInMilliSec);
        }
    }

    async push(workerProcesses: string[],
               workerData: IWorkerData,
               workerInstance: string = ''): Promise<boolean> {

        if (this.getQueueRunningSize() === 0) {
            await this.resume();
        }

        const params: IWorkerParams = {
            workerProcesses,
            workerInstance,
            workerData,
            workerProcessorPathFile: this.workerProcessorPathFile,
        };
        loggerFactory.getLogger().info('Launcher.push:', JSON.stringify(params));

        try {
            if (this.queueLauncher) {
                await this.queueLauncher.add(params);
            } else if (this.threadStrategy === STRATEGIES.THREAD) {
                const path = require('node:path');
                const {Worker} = require('worker_threads');
                const newWorker = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
            } else {
                await this.directWorker(params);
            }
            return true;
        } catch (err) {
            loggerFactory.getLogger().error(err);
        }

        return false;
    }

    async getStoreWaitingSize() {
        if (!this.queueLauncher) {
            return 0;
        }

        return this.queueLauncher.getStoreWaitingSize();
    }

    async getStoreRunningSize() {
        if (!this.queueLauncher) {
            return 0;
        }

        return this.queueLauncher.getStoreRunningSize();
    }

    getQueueRunningSize(): number {
        if (!this.queueLauncher) {
            return 0;
        }

        return this.queueLauncher.getQueueRunningSize();
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
