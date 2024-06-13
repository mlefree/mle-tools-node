import PollingTimer from 'polling-timer';
import {LoggerFactory} from '../logs';
import {IWorkerParams} from './IWorkerParams';
import {QueueConcurrency} from './QueueConcurrency';
import {AbstractWorkerStore} from './AbstractWorkerStore';

export class QueueLauncher {

    private pollingTimer: PollingTimer
    private queueNames: string[];
    private runningWorkers: any;
    private shouldStopAll: boolean;

    constructor(
        protected directWorker: (params: any, onEnd: () => void, onError: (code: number) => void) => Promise<void>,
        protected threadWorker: (params: any, onEnd: () => void, onError: (code: number) => void) => void,
        protected loggerFactory: LoggerFactory,
        protected concurrency: QueueConcurrency,
        protected workerStore: AbstractWorkerStore,
        pollingTimeInMilliSec = 100,
    ) {
        this.clean();

        this.pollingTimer = new PollingTimer(pollingTimeInMilliSec);
        this.pollingTimer.setRunCallback(this.pollerCallback.bind(this));
        this.pollingTimer.start();
    }

    async add(params: IWorkerParams) {
        this.loggerFactory.getLogger().info('### Queue Lengths:', this.getQueueRunningSize());
        await this.workerStore.push(params.workerProcesses.join('-'), params);
    }

    async getStoreRunningSize() {
        return this.workerStore.size({inProgress: true});
    }

    async getStoreWaitingSize() {
        return this.workerStore.size({inProgress: false});
    }

    getQueueRunningSize() {
        let length = 0;
        try {
            for (const key of Object.keys(this.runningWorkers)) {
                length += this.runningWorkers[key] ? this.runningWorkers[key] : 0;
            }
            return length;
        } catch (e) {
            this.clean();
            return 0;
        }
    }

    stopAll(stop = true) {
        this.shouldStopAll = stop;
    }

    async end(queueName: string, params: IWorkerParams) {
        await this.workerStore.remove(queueName, params);

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }

    }

    async error(queueName: string, params: IWorkerParams) {
        await this.workerStore.release(queueName, params);

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }
    }

    private async syncQueuesFromStore() {
        if (this.queueNames.length) {
            return;
        }

        this.clean();
        this.queueNames = await this.workerStore.getNamesAfterMemoryCleanUp();
    }

    private async pollerCallback() {
        if (this.shouldStopAll) {
            return;
        }

        await this.syncQueuesFromStore();

        for (const queueName of this.queueNames) {

            // check concurrency limit
            const {concurrency} = this.getKeyConcurrency(queueName);
            const notExists = typeof this.runningWorkers[queueName] === 'undefined';
            if (notExists) {
                this.runningWorkers[queueName] = 0;
            }
            if (this.runningWorkers[queueName] > concurrency) {
                continue;
            }

            const params = await this.workerStore.take(queueName);
            if (!params) {
                continue;
            }

            this.runningWorkers[queueName]++;

            const {WorkerProcessor} = require(params.workerProcessorPathFile);
            const allProcesses = WorkerProcessor.GetProcesses();
            const processes = allProcesses.filter(p => params.workerProcesses.indexOf(p.fn.name) > -1);
            const needTread = processes.filter(p => p.inThreadIfPossible).length > 0;
            if (needTread && this.threadWorker) {
                this.threadWorker(params,
                    () => {
                        this.end(queueName, params);
                    },
                    (code) => {
                        if (code === 1) {
                            this.error(queueName, params);
                        } else {
                            this.end(queueName, params);
                        }
                    });
            } else {
                await this.directWorker(params,
                    () => {
                        this.end(queueName, params);
                    },
                    (code) => {
                        if (code === 1) {
                            this.error(queueName, params);
                        } else {
                            this.end(queueName, params);
                        }
                    });
            }
        }
    }

    private getKeyConcurrency(key: string) {
        // const paramsAsString = JSON.stringify(params);

        // let key = params.workerProcesses.join('-');
        let concurrency = this.concurrency.default;
        for (const filter of this.concurrency.keys) {
            if (key.indexOf(filter.contains) >= 0) {
                key = filter.contains;
                concurrency = filter.concurrency;
            }
        }

        return {key, concurrency};
    }

    private clean() {
        this.queueNames = [];
        this.runningWorkers = {};
        this.shouldStopAll = false;
    }
}
