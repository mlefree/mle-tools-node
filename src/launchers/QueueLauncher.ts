import Queue from 'queue';
import {IWorkerParams} from './Launcher';
import {LoggerFactory} from '../logs/LoggerFactory';

export interface QueueConcurrency {
    default: number,
    keys: {
        contains: string,
        concurrency: number,
    }[]
}

export class QueueLauncher {

    private readonly queues: any; // Queue
    private readonly queueParams: any;
    private queueCumulativeCount: number;

    constructor(
        protected queueWorker: Function,
        protected loggerFactory: LoggerFactory,
        protected concurrency: QueueConcurrency,
    ) {
        this.queueCumulativeCount = 0;
        this.queues = {};
        this.queueParams = {};
    }

    add(params: IWorkerParams) {
        this.queueCumulativeCount++;
        this.loggerFactory.getLogger().info('### Queue Lengths:', this.getQueueCumulativeSize(), this.queueCumulativeCount);

        const paramsAsString = JSON.stringify(params);

        let key = '' + params.workerDescription;
        let concurrency = this.concurrency.default;
        for (const filter of this.concurrency.keys) {
            if (paramsAsString.indexOf(filter.contains) >= 0) {
                key = filter.contains;
                concurrency = filter.concurrency;
            }
        }

        let notExists = typeof this.queueParams[key] === 'undefined';
        if (notExists) {
            this.queueParams[key] = [];
        } else {
            notExists = this.queueParams[key].indexOf(paramsAsString) < 0;
        }

        if (notExists) {
            this.queueParams[key].push(paramsAsString);
            if (typeof this.queues[key] === 'undefined') {
                this.queues[key] = new Queue({concurrency, autostart: true});
            }

            this.queues[key].push(cb => this.queueWorker(params, cb));
        } else {
            this.loggerFactory.getLogger().info('### Queue duplicate', paramsAsString);
        }
    }

    getQueueCumulativeSize() {
        let length = 0;
        for (const key of Object.keys(this.queues)) {
            const queueLength = this.queues[key].length;
            if (queueLength === 0) {
                delete this.queues[key];
                delete this.queueParams[key];
            }
            length += queueLength;
        }
        return length;
    }

    stopAll() {
        for (const key of Object.keys(this.queues)) {
            const queue: Queue = this.queues[key];
            queue.end(new Error('stoooopp'));
        }
    }
}

