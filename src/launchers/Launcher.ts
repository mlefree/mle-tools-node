import {loggerFactory} from '../logger';
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

const DEFAULT_CONCURRENCY = 3; // <= default queueConcurrency
const DEFAULT_POLLING_MS = 500; // <= default pollingTimeInMilliSec

export class Launcher {
    private readonly queueLauncher: QueueLauncher;

    private readonly directWorker: any;

    constructor(
        protected options: {
            workerProcessorPathFile: string;
            workerStore?: AbstractWorkerStore;
            threadStrategy?: string;
            queueConcurrency?: QueueConcurrency;
            pollingTimeInMilliSec?: number;
            disablePolling?: boolean;
            name?: string;
        }
    ) {
        // Increase process max listeners to prevent warnings when using multiple workers
        // Set to 0 (unlimited) to avoid MaxListenersExceededWarning when many projects/instances add handlers.
        // This does not introduce leaks by itself; it only removes the arbitrary warning threshold.
        // process.setMaxListeners(0);
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
        if (!this.options.name) {
            this.options.name = '[mtn]';
        }

        this.directWorker = require('./asDirect');

        if (this.options.threadStrategy === STRATEGIES.QUEUE) {
            const threadWorker = require('./asThreadWorker');
            this.queueLauncher = new QueueLauncher(
                this.directWorker,
                threadWorker,
                loggerFactory.getLogger(),
                this.options as {
                    workerProcessorPathFile: string;
                    workerStore: AbstractWorkerStore;
                    queueConcurrency: QueueConcurrency;
                    pollingTimeInMilliSec: number;
                    disablePolling: boolean;
                    name: string;
                }
            );
        }
    }

    async push(
        workerProcesses: string[],
        workerData: IWorkerData,
        workerInstance: string = ''
    ): Promise<boolean> {
        if ((await this.getQueueRunningSize()) === 0) {
            await this.resume();
        }

        const params: IWorkerParams = {
            workerProcesses,
            workerInstance,
            workerData,
            workerProcessorPathFile: this.options.workerProcessorPathFile,
        };

        try {
            if (this.queueLauncher && this.options.threadStrategy === STRATEGIES.QUEUE) {
                await this.queueLauncher.add(params);
            } else if (this.options.threadStrategy === STRATEGIES.THREAD) {
                const path = require('node:path');
                const {Worker} = require('worker_threads');
                const simpleWorker = new Worker(path.join(__dirname, './asThread.js'), {
                    workerData: params,
                });

                const messageHandler = (any) => {
                    loggerFactory.getLogger().debug('(mtn) THREAD message', any);
                };
                const errorHandler = (any) => {
                    loggerFactory.getLogger().debug('(mtn) THREAD error', any);
                };
                const exitHandler = (any) => {
                    loggerFactory.getLogger().debug('(mtn) THREAD finished', any);
                    // Clean up event listeners to prevent memory leaks
                    simpleWorker.removeListener('message', messageHandler);
                    simpleWorker.removeListener('error', errorHandler);
                    simpleWorker.removeListener('exit', exitHandler);
                };

                simpleWorker.on('message', messageHandler);
                simpleWorker.on('error', errorHandler);
                simpleWorker.on('exit', exitHandler);
            } else if (this.directWorker) {
                await this.directWorker(
                    params,
                    (e: any) => {
                        loggerFactory.getLogger().debug('(mtn) Direct Worker finished', e);
                    },
                    (error: any) => {
                        loggerFactory.getLogger().error('(mtn) Direct Worker error:', error);
                    }
                );
            }
            return true;
        } catch (err) {
            loggerFactory.getLogger().error('(mtn) ', err);
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
        return [
            {
                queueName: 'todo',
                storeWaitingSize: await this.getStoreWaitingSize(),
                storeRunningSize: await this.getStoreRunningSize(),
                queueRunningSize: await this.getQueueRunningSize(),
            },
        ];
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

    setQueueConcurrency(queueConcurrency: QueueConcurrency) {
        this.queueLauncher?.setQueueConcurrency(queueConcurrency);
    }

    setWorkerStore(store: AbstractWorkerStore) {
        this.options.workerStore = store;
        this.queueLauncher?.setWorkerStore(store);
    }
}
