// import Queue from 'queue';
import PollingTimer from 'polling-timer';
import {LoggerFactory} from '../logs/LoggerFactory';
import {IWorkerParams} from './IWorkerParams';
import {QueueConcurrency} from './QueueConcurrency';
import {AbstractWorkerStore} from './AbstractWorkerStore';

export class QueueLauncher {

    private pollingTimer: PollingTimer
    private readonly queueParams: any;
    private runningWorkers: any;
    private shouldStopAll: boolean;

    constructor(
        protected queueWorker: Function,
        protected loggerFactory: LoggerFactory,
        protected concurrency: QueueConcurrency,
        protected workerStore: AbstractWorkerStore,
        pollingTimeInMilliSec = 100,
    ) {
        this.queueParams = {};
        this.runningWorkers = {};
        this.shouldStopAll = false;

        this.pollingTimer = new PollingTimer(pollingTimeInMilliSec);
        this.pollingTimer.setRunCallback(this.pollerCallback.bind(this));
        this.pollingTimer.start();
    }

    add(params: IWorkerParams) {
        this.loggerFactory.getLogger().info('### Queue Lengths:', this.getQueueWaitingSize(), this.getQueueRunningSize());

        const {key, concurrency} = this.getKeyConcurrency(params);

        const paramsAsString = JSON.stringify(params);
        let notExists = typeof this.queueParams[key] === 'undefined';
        if (notExists) {
            this.queueParams[key] = [];
        } else {
            notExists = this.queueParams[key].indexOf(paramsAsString) < 0;
        }

        if (notExists) {
            this.queueParams[key].push(paramsAsString);
            this.workerStore.push(key, params);
        } else {
            this.loggerFactory.getLogger().info('### Queue duplicate', paramsAsString);
        }
    }

    getQueueWaitingSize() {
        let length = 0;
        for (const key of Object.keys(this.queueParams)) {
            const queueLength = this.queueParams[key].length;
            if (queueLength === 0) {
                delete this.queueParams[key];
            }
            length += queueLength;
        }
        return length;
    }

    getQueueRunningSize() {
        let length = 0;
        for (const key of Object.keys(this.runningWorkers)) {
            const queueLength = this.runningWorkers[key];
            if (queueLength === 0) {
                delete this.runningWorkers[key];
            }
            length += queueLength;
        }
        return length;
    }

    stopAll(stop = true) {
        this.shouldStopAll = stop;
    }

    private async pollerCallback() {
        if (this.shouldStopAll) {
            return;
        }

        for (const queueName in this.queueParams) {
            const {concurrency} = this.getKeyConcurrency(this.queueParams[queueName]);

            let notExists = typeof this.runningWorkers[queueName] === 'undefined';
            if (notExists) {
                this.runningWorkers[queueName] = [];
            }

            if (this.runningWorkers[queueName] <= concurrency) {
                const params = await this.workerStore.take(queueName);
                if (params) {
                    const paramsAsString = JSON.stringify(params);
                    const toRemove = this.queueParams[queueName].indexOf(paramsAsString);
                    if (toRemove >= 0) {
                        this.queueParams[queueName].splice(toRemove, 1);
                    }

                    this.runningWorkers[queueName]++;
                    this.queueWorker(params, () => {
                        this.runningWorkers[queueName]--;
                    });
                }
            }
        }
    }

    private getKeyConcurrency(params: IWorkerParams) {
        const paramsAsString = JSON.stringify(params);

        let key = '' + params.workerDescription;
        let concurrency = this.concurrency.default;
        for (const filter of this.concurrency.keys) {
            if (paramsAsString.indexOf(filter.contains) >= 0) {
                key = filter.contains;
                concurrency = filter.concurrency;
            }
        }

        return {key, concurrency};
    }
}

