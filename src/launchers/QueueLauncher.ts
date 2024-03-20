import Queue from 'queue';
import {IWorkerParams} from './Launcher';
import {LoggerFactory} from '../logs/LoggerFactory';

const CONCURRENCY = 3;

export class QueueLauncher {

    private readonly queues: any; // Queue
    private readonly queueParams: any;
    private queueCumulativeCount: number;

    constructor(
        protected queueWorker: Function,
        protected loggerFactory: LoggerFactory,
    ) {
        this.queueCumulativeCount = 0;
        this.queues = {};
        this.queueParams = {};
    }

    add(params: IWorkerParams) {
        this.queueCumulativeCount++;
        this.loggerFactory.getLogger().info('### Queue Lengths:', this.getQueueCumulativeSize(), this.queueCumulativeCount);

        const key = '' + params?.workerDescription + '-' + params?.workerData?.input?.rainId;
        const paramsAsString = JSON.stringify(params);
        let notExists = typeof this.queueParams[key] === 'undefined';
        if (notExists) {
            this.queueParams[key] = [];
        } else {
            notExists = this.queueParams[key].indexOf(paramsAsString) < 0;
        }

        if (notExists) {
            this.queueParams[key].push(paramsAsString);
            if (typeof this.queues[key] === 'undefined') {
                this.queues[key] = new Queue({concurrency: CONCURRENCY, autostart: true});
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

