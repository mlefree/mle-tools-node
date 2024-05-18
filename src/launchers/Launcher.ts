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

    constructor(
        public workerProcessorPathFile: any,
        public workerStore: AbstractWorkerStore = new DefaultWorkerStore(),
        public threadStrategy: string = STRATEGIES.DIRECT,
        protected queueConcurrency: QueueConcurrency = {default: CONCURRENCY, keys: []},
        pollingTimeInMilliSec = 500,
    ) {
        if (this.threadStrategy === STRATEGIES.QUEUE) {
            this.queueLauncher = new QueueLauncher(require('./asQueue'),
                loggerFactory, this.queueConcurrency, this.workerStore, pollingTimeInMilliSec);
        }
    }

    async push(workerDescription: string,
               workerData: IWorkerData,
               workerInstance: string = ''): Promise<boolean> {

        if (this.getQueueRunningSize() === 0) {
            this.queueLauncher?.stopAll(false)
            AbstractWorkerProcessor.ForceStop(false);
        }

        const params: IWorkerParams = {
            workerDescription,
            workerInstance,
            workerData,
            workerProcessorPathFile: this.workerProcessorPathFile,
        };
        loggerFactory.getLogger().info('Launcher.push:', JSON.stringify(params));

        try {
            if (this.threadStrategy === STRATEGIES.QUEUE && this.queueLauncher) {
                this.queueLauncher.add(params);
            } else if (this.threadStrategy === STRATEGIES.THREAD) {
                const path = require('node:path');
                const {Worker} = require('worker_threads');
                const newWorker = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
            } else {
                const directWorker = require('./asDirect');
                await directWorker(params);
            }
            return true;
        } catch (err) {
            loggerFactory.getLogger().error(err);
        }

        return false;
    }

    getQueueWaitingSize(): number {
        if (!this.queueLauncher) {
            return 0;
        }

        return this.queueLauncher.getQueueWaitingSize();
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
}
