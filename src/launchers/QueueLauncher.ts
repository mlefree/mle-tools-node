import PollingTimer from 'polling-timer';
import {Logger} from '../logs';
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
        protected logger: Logger,
        protected options: {
            workerProcessorPathFile: string,
            workerStore: AbstractWorkerStore,
            queueConcurrency: QueueConcurrency,
            pollingTimeInMilliSec: number,
            disablePolling: boolean,
        }
    ) {
        this.clean();
    }

    async add(params: IWorkerParams) {
        // this.logger.info('### Queue Lengths:', this.getQueueRunningSize());
        await this.options.workerStore.push(params.workerProcesses.join('-'), params);
    }

    checkAndGetQueueRunningSize() {
        let length = 0;
        try {
            this.init();

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
        if (stop) {
            this.clean();
        }
        this.shouldStopAll = stop;
    }

    async end(queueName: string, params: IWorkerParams) {
        await this.options.workerStore.remove(queueName, params);

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }

    }

    async error(queueName: string, params: IWorkerParams) {
        await this.options.workerStore.release(queueName, params);

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }
    }

    public clean() {
        this.queueNames = [];
        this.runningWorkers = {};
        this.shouldStopAll = false;
    }

    private init() {
        if (this.options.disablePolling) {
            return;
        }

        if (this.pollingTimer && this.pollingTimer.startTime) {
            return;
        }

        this.pollingTimer = new PollingTimer(this.options.pollingTimeInMilliSec);
        this.pollingTimer.setRunCallback(this.pollerCallback.bind(this));
        this.pollingTimer.start();
    }

    private async syncQueuesFromStore() {
        if (this.queueNames.length) {
            return;
        }

        this.clean();
        this.queueNames = await this.options.workerStore.getNamesAfterMemoryCleanUp();
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

            const params = await this.options.workerStore.take(queueName);
            if (!params) {
                this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
                continue;
            }

            this.runningWorkers[queueName]++;
            if (!params.workerProcesses) {
                params.workerProcesses = ['' + params['workerDescription'] ? params['workerDescription'] : ''];
            }
            params.workerProcessorPathFile = this.options.workerProcessorPathFile;

            let needTread = false;
            try {
                const {WorkerProcessor} = require(this.options.workerProcessorPathFile);
                const allProcesses = WorkerProcessor.GetProcesses();
                const processes = allProcesses.filter(p => params.workerProcesses.indexOf(p.fn.name) > -1);
                needTread = processes.filter(p => p.inThreadIfPossible).length > 0;
            } catch (e) {
                this.logger.warn('queue workerProcessor issue:', e);
            }

            if (needTread && this.threadWorker) {
                this.threadWorker(params,
                    () => {
                        this.end(queueName, params);
                    },
                    (code) => {
                        if (code === 1) { // => retry
                            this.error(queueName, params);
                        } else {
                            this.end(queueName, params);
                        }
                    });
            } else if (this.directWorker) {
                this.directWorker(params,
                    () => {
                        this.end(queueName, params);
                    },
                    (code) => {
                        if (code === 1) { // => retry
                            this.error(queueName, params);
                        } else {
                            this.end(queueName, params);
                        }
                    }).then(ignored => {
                });
            }
        }
    }

    private getKeyConcurrency(key: string) {
        let concurrency = this.options.queueConcurrency.default;
        for (const filter of this.options.queueConcurrency.keys) {
            if (key.indexOf(filter.contains) >= 0) {
                key = filter.contains;
                concurrency = filter.concurrency;
            }
        }

        return {key, concurrency};
    }
}
