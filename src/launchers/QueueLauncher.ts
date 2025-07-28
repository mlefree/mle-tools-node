import PollingTimer from 'polling-timer';
import {Logger} from '../logs';
import {IWorkerParams} from './IWorkerParams';
import {QueueConcurrency} from './QueueConcurrency';
import {AbstractWorkerStore} from './AbstractWorkerStore';

export class QueueLauncher {
    protected pollingTimer: PollingTimer;
    protected queueNames: string[];
    protected runningWorkers: object;
    protected shouldStopAll: boolean;

    constructor(
        protected directWorker: (
            params: any,
            onEnd: () => void,
            onError: (code: number) => void
        ) => Promise<void>,
        protected threadWorker: (
            params: any,
            onEnd: () => void,
            onError: (code: number) => void
        ) => void,
        protected logger: Logger,
        protected options: {
            workerProcessorPathFile: string;
            workerStore: AbstractWorkerStore;
            queueConcurrency: QueueConcurrency;
            pollingTimeInMilliSec: number;
            disablePolling: boolean;
            name: string;
        }
    ) {
        this.clean();
    }

    async add(params: IWorkerParams) {
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before add`
        );
        await this.options.workerStore.push(params.workerProcesses.join('-'), params);
    }

    checkAndGetQueueRunningSize() {
        let length = 0;
        try {
            this.init();

            for (const key of Object.keys(this.runningWorkers)) {
                length += this.runningWorkers[key] ? this.runningWorkers[key] : 0;
            }

            if (length === 0) {
                this.logger.debug(`[mtn] Queue - check runningWorkers length === 0 => clean`);
                this.clean();
            }

            return length;
        } catch (e) {
            this.clean();
            return 0;
        }
    }

    stopAll(stop = true) {
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before stopAll`
        );
        this.shouldStopAll = stop;
        if (stop) {
            this.clean();
            this.stopPolling();
        }
    }

    async end(queueName: string, params: IWorkerParams) {
        this.logger.debug(`[mtn] Queue - end ${queueName}`);
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before end`
        );

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }

        await this.options.workerStore.remove(queueName, params);
    }

    async error(queueName: string, params: IWorkerParams) {
        this.logger.debug(`[mtn] Queue - error ${queueName}`);
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before error`
        );

        // Get the worker processor to check if any of the processes should keep in queue
        const WorkerProcessor = require(this.options.workerProcessorPathFile);
        const processes = WorkerProcessor.GetProcesses ? WorkerProcessor.GetProcesses() : [];
        const shouldKeepInQueue = processes.some((p) => p.keepInTheQueue);

        if (this.runningWorkers[queueName]) {
            this.runningWorkers[queueName]--;
        }
        if (this.runningWorkers[queueName] === 0) {
            delete this.runningWorkers[queueName];
            this.queueNames.splice(this.queueNames.indexOf(queueName), 1);
        }

        await this.options.workerStore.release(queueName, params, shouldKeepInQueue);
    }

    public clean() {
        this.queueNames = [];
        this.runningWorkers = {};
        this.shouldStopAll = false;
    }

    public setQueueConcurrency(queueConcurrency: QueueConcurrency) {
        this.options.queueConcurrency = Object.create(queueConcurrency);
    }

    public setWorkerStore(store: AbstractWorkerStore) {
        this.options.workerStore = store;
    }

    protected stopPolling() {
        this.logger.info(`[mtn] Queue - stopPolling`);
        this.pollingTimer?.stop();
    }

    protected init() {
        if (this.options.disablePolling) {
            return;
        }

        if (this.pollingTimer && this.pollingTimer.startTime) {
            return;
        }

        this.logger.info(`[mtn] Queue - init polling each ${this.options.pollingTimeInMilliSec}`);
        this.pollingTimer = new PollingTimer(this.options.pollingTimeInMilliSec);
        this.pollingTimer.setRunCallback(this.pollerCallback.bind(this));
        this.pollingTimer.start();
    }

    protected async syncQueuesFromStore() {
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before syncQueuesFromStore`
        );

        if (this.queueNames.length === 0) {
            this.logger.debug(`[mtn] Queue - no more queue names => clean`);
            this.clean();
        }

        this.queueNames = await this.options.workerStore.getNamesAfterMemoryCleanUp();

        this.logger.debug(`[mtn] Queue - names (${this.options.name}): ${this.queueNames.length}`);
    }

    protected async pollerCallback() {
        if (this.shouldStopAll) {
            return;
        }

        await this.syncQueuesFromStore();

        for (const queueName of this.queueNames) {
            // Get and verify concurrency
            const {concurrency} = this.getKeyConcurrency(queueName);
            const notExists =
                typeof this.runningWorkers[queueName] === 'undefined' ||
                Number.isNaN(this.runningWorkers[queueName]);
            if (notExists) {
                this.runningWorkers[queueName] = 0;
            }
            if (this.runningWorkers[queueName] >= concurrency) {
                continue;
            }

            // Get and verify params
            const params = await this.options.workerStore.take(queueName);
            if (!params) {
                continue;
            }

            // Execute queue worker
            this.executeWorker(queueName, params);
        }
    }

    protected executeWorker(queueName: string, params: IWorkerParams) {
        this.logger.debug(`[mtn] Queue - executeWorker ${queueName}`);
        this.logger.debug(
            `[mtn] Queue - check runningWorkers: ${JSON.stringify(this.runningWorkers)} before executeWorker`
        );

        this.runningWorkers[queueName]++;

        if (!params.workerProcesses) {
            params.workerProcesses = [
                '' + params['workerDescription'] ? params['workerDescription'] : '',
            ];
        }
        params.workerProcessorPathFile = this.options.workerProcessorPathFile;

        let needTread = false;
        try {
            const {WorkerProcessor} = require(this.options.workerProcessorPathFile);
            const allProcesses = WorkerProcessor.GetProcesses();
            const processes = allProcesses.filter(
                (p) => params.workerProcesses.indexOf(p.fn.name) > -1
            );
            needTread = processes.filter((p) => p.inThreadIfPossible).length > 0;
        } catch (e) {
            this.logger.warn('[mtn] Queue - executeWorker workerProcessor issue:', e);
        }

        if (needTread && this.threadWorker) {
            this.logger.debug('[mtn] Queue - executeWorker needTread');
            this.threadWorker(
                params,
                () => {
                    this.end(queueName, params).then((_ignored) => {});
                },
                (code) => {
                    this.logger.debug('[mtn] Queue - executeWorker thread has failed:', code);
                    if (code === 1) {
                        // => retry
                        this.error(queueName, params).then((_ignored) => {});
                    } else {
                        this.end(queueName, params).then((_ignored) => {});
                    }
                }
            );
        } else if (this.directWorker) {
            this.logger.debug('[mtn] Queue - executeWorker is used in a direct worker');
            this.directWorker(
                params,
                () => {
                    this.end(queueName, params).then((_ignored) => {});
                },
                (code) => {
                    this.logger.debug('[mtn] Queue - executeWorker direct has failed:', code);
                    if (code === 1) {
                        // => retry
                        this.error(queueName, params).then((_ignored) => {});
                    } else {
                        this.end(queueName, params).then((_ignored) => {});
                    }
                }
            ).then((_ignored) => {});
        }
    }

    protected getKeyConcurrency(key: string) {
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
