import {loggerFactory} from '../logs/LoggerFactory';
import {QueueLauncher} from './QueueLauncher';
import {IWorkerData} from './AbstractWorkerProcessor';

export enum STRATEGIES {
    DIRECT = 'direct',
    QUEUE = 'queue',
    THREAD = 'thread',
}

export interface IWorkerParams {
    workerDescription: string,
    workerInstance: string,
    workerData: IWorkerData,
    workerProcessorPathFile: string,
}

export class Launcher {
    private readonly queueLauncher: QueueLauncher;

    constructor(
        public workerProcessorPathFile: any,
        public threadStrategy: string = STRATEGIES.DIRECT
    ) {

        if (this.threadStrategy === STRATEGIES.QUEUE) {
            this.queueLauncher = new QueueLauncher(require('./asQueue'));
        }
    }

    async push(workerDescription: string,
               workerData: IWorkerData,
               workerInstance = new Date().toISOString()): Promise<boolean> {

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
                new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
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

    getQueueSize(): number {
        if (!this.queueLauncher) {
            return 0;
        }

        return this.queueLauncher.getQueueCumulativeSize();
    }
}

