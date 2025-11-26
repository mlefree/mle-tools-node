import PollingTimer from 'polling-timer';
import {Logger} from '../logger';
import {IWorkerParams} from './IWorkerParams';
import {QueueConcurrency} from './QueueConcurrency';
import {AbstractWorkerStore} from './AbstractWorkerStore';
import {DefaultWorkerStore} from './DefaultWorkerStore';

export class QueueLauncher {
    protected pollingTimer: PollingTimer;
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
        protected workerStore?: AbstractWorkerStore,
        protected logger?: Logger,
        protected options?: {
            workerProcessorPathFile?: string;
            queueConcurrency?: QueueConcurrency;
            pollingTimeInMilliSec?: number;
            disablePolling?: boolean;
            name?: string;
        }
    ) {
        if (!this.workerStore) {
            this.workerStore = new DefaultWorkerStore();
        }
        if (!this.options) {
            this.options = {};
        }
        this.clean();
    }

    isRunning() {
        if (this.shouldStopAll || this.options.disablePolling) {
            return false;
        }

        if (this.pollingTimer?.startTime) {
            return true;
        }
        return false;
    }

    async add(params: IWorkerParams) {
        this.logger?.debug(`(mtn) Queue - add ${params.workerData.namesToLaunch}`);
        return await this.workerStore.push(params);
    }

    stopAll(stop = true) {
        this.logger?.debug(`(mtn) Queue - stopAll ${stop}`);
        this.shouldStopAll = stop;
        if (stop) {
            this.stopPolling();
        } else {
            this.startPolling();
        }
    }

    async end(params: IWorkerParams) {
        this.logger?.debug(`(mtn) Queue - end ${params.workerData.namesToLaunch} => remove`);
        await this.workerStore.remove(params);
    }

    async error(params: IWorkerParams) {
        this.logger?.debug(
            `(mtn) Queue - error ${params.workerData.namesToLaunch} => release (potential keep it, to try back)`
        );

        // Get the worker processor to check if any of the processes should keep in queue
        let processes = [];
        if (this.options.workerProcessorPathFile) {
            const WorkerProcessor = require(this.options.workerProcessorPathFile);
            processes = WorkerProcessor.GetProcesses ? WorkerProcessor.GetProcesses() : [];
        }
        const shouldKeepInQueue = processes.some((p) => p.keepInTheQueue);

        await this.workerStore.release(params, shouldKeepInQueue);
    }

    clean() {
        this.logger?.debug(`(mtn) Queue - clean => try to not shouldStopAll`);
        this.shouldStopAll = false;
    }

    setQueueConcurrency(queueConcurrency: QueueConcurrency) {
        this.options.queueConcurrency = Object.create(queueConcurrency);
    }

    setWorkerStore(store: AbstractWorkerStore) {
        this.logger?.debug(`(mtn) Queue - setWorkerStore`);
        this.workerStore = store;
    }

    protected stopPolling() {
        this.logger?.warn(`(mtn) Queue - stopPolling`);
        this.pollingTimer?.stop();
        this.workerStore?.onStop().then((_) => {});
    }

    protected startPolling() {
        if (this.options.disablePolling) {
            return;
        }

        // if (this.pollingTimer?.startTime) {
        //     return;
        // }
        this.pollingTimer?.stop();

        const pollingTimeInMilliSec = this.options.pollingTimeInMilliSec
            ? this.options.pollingTimeInMilliSec
            : 100;
        this.logger?.info(`(mtn) Queue - init polling each ${pollingTimeInMilliSec}`);
        this.pollingTimer = new PollingTimer(pollingTimeInMilliSec);
        this.pollingTimer.setRunCallback(this.pollerCallback.bind(this));
        this.pollingTimer.start();
    }

    protected async syncQueuesFromStore() {
        const queueNames = await this.workerStore.getNamesAfterMemoryCleanUp();
        this.logger?.debug(`(mtn) Queue - syncQueuesFromStore names ${queueNames}`);

        if (queueNames.length === 0) {
            this.logger?.debug(`(mtn) Queue - no more queue names => clean`);
            this.clean();
        }

        return queueNames;
    }

    protected async pollerCallback() {
        if (this.shouldStopAll) {
            return;
        }

        const queueNames = await this.syncQueuesFromStore();

        // Randomize queueNames using Fisher-Yates shuffle
        for (let i = queueNames.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queueNames[i], queueNames[j]] = [queueNames[j], queueNames[i]];
        }

        for (const queueProcesses of queueNames) {
            // Get and verify concurrency
            const {concurrency} = this.getKeyConcurrency(queueProcesses);

            const size = await this.workerStore.size({names: queueProcesses, inProgress: true});

            this.logger?.debug(
                `(mtn) Queue - pollerCallback (${queueProcesses}): ${size} ${concurrency}`
            );
            if (size >= concurrency) {
                continue;
            }

            // Get and verify params
            const params = await this.workerStore.take(queueProcesses);
            if (!params) {
                continue;
            }

            // Execute queue worker
            this.executeWorker(params);

            // One execution by pollerCallback
            break;
        }
    }

    protected executeWorker(params: IWorkerParams) {
        this.logger?.debug(`(mtn) Queue - executeWorker`);

        params.workerProcessorPathFile = this.options.workerProcessorPathFile;

        let needTread = false;
        try {
            const {WorkerProcessor} = require(this.options.workerProcessorPathFile);
            const allProcesses = WorkerProcessor.GetProcesses ? WorkerProcessor.GetProcesses() : [];
            const processes = allProcesses.filter(
                (p) => params.workerProcesses.indexOf(p.fn.name) >= 0
            );
            needTread = processes.filter((p) => p.inThreadIfPossible).length > 0;
        } catch (e) {
            this.logger?.warn('(mtn) Queue - executeWorker workerProcessor issue:', e);
        }

        if (needTread && this.threadWorker) {
            this.logger?.debug('(mtn) Queue - executeWorker in thread worker');
            this.threadWorker(
                params,
                () => {
                    this.end(params).then((_ignored) => {});
                },
                (code) => {
                    this.logger?.debug(
                        '(mtn) Queue - executeWorker in thread worker has failed:',
                        code
                    );
                    if (code === 1) {
                        // => retry
                        this.error(params).then((_ignored) => {});
                    } else {
                        this.end(params).then((_ignored) => {});
                    }
                }
            );
        } else if (this.directWorker) {
            this.logger?.debug('(mtn) Queue - executeWorker in a direct worker');
            this.directWorker(
                params,
                () => {
                    this.end(params).then((_ignored) => {});
                },
                (code) => {
                    this.logger?.debug(
                        '(mtn) Queue - executeWorker in a direct worker has failed:',
                        code
                    );
                    if (code === 1) {
                        // => retry
                        this.error(params).then((_ignored) => {});
                    } else {
                        this.end(params).then((_ignored) => {});
                    }
                }
            ).then((_ignored) => {});
        }
    }

    protected getKeyConcurrency(queueProcesses: string[]) {
        let concurrency = this.options?.queueConcurrency?.default ?? 1;
        let key: string;
        for (const filter of this.options.queueConcurrency.keys) {
            if (queueProcesses.indexOf(filter.contains) >= 0) {
                key = filter.contains;
                concurrency = filter.concurrency;
                break;
            }
        }

        return {key, concurrency};
    }
}
