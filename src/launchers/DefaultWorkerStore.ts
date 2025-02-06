import {AbstractWorkerStore} from './AbstractWorkerStore';
import {IWorkerParams} from './IWorkerParams';
import {loggerFactory} from '../logs';

export class DefaultWorkerStore extends AbstractWorkerStore {
    private queues = {};

    constructor() {
        super();
        this.removeAll();
    }

    async push(queueName: string, params: IWorkerParams): Promise<void> {
        if (!this.queues[queueName]) {
            this.queues[queueName] = [];
        }

        const paramsAsStr = JSON.stringify(params);

        const alreadyThere = this.queues[queueName].filter(q => q.params === paramsAsStr);
        if (!alreadyThere.length) {
            this.queues[queueName].push({params: paramsAsStr, inProgress: false});
        }
    }

    async take(queueName: string): Promise<IWorkerParams> {
        const waiting = this.queues[queueName]
            .filter(e => !e.inProgress);

        if (waiting.length > 0) {
            const firstWaiting = waiting[0];
            firstWaiting.inProgress = true;
            return JSON.parse(firstWaiting.params);
        }

        return null;
    }

    async release(queueName: string, params: IWorkerParams): Promise<void> {
        let pos = -1;

        const paramsAsStr = JSON.stringify(params);
        for (const [index, value] of this.queues[queueName].entries()) {
            if (value.params === paramsAsStr) {
                pos = index;
                break;
            }
        }
        if (pos > -1) {
            this.queues[queueName][pos].inProgress = false;
        }
    }

    async remove(queueName: string, params: IWorkerParams): Promise<void> {
        let pos = -1;
        const paramsAsStr = JSON.stringify(params);
        for (const [index, value] of this.queues[queueName].entries()) {
            if (value.params === paramsAsStr) {
                pos = index;
                break;
            }
        }
        if (pos > -1) {
            this.queues[queueName].splice(pos, 1);
        }
    }

    removeAll() {
        this.queues = {};
    }

    async size(options?: {
        queueName?: string,
        inProgress?: boolean
    }): Promise<number> {
        if (options?.queueName && !this.queues[options.queueName]) {
            loggerFactory.getLogger().error('### WorkerStore queues issue:', this.queues);
            return -1;
        }

        if (!options?.queueName) {
            return (Object.values(this.queues) as any[])
                .reduce((p: number, e: Array<any>) => {
                    let arr = e;
                    if (options?.inProgress) {
                        arr = e.filter(p => p.inProgress);
                    } else if (options && typeof options.inProgress !== 'undefined') {
                        arr = e.filter(p => !p.inProgress);
                    }
                    return p + arr.length;
                }, 0);
        }

        let queue = this.queues[options.queueName];
        if (options?.inProgress) {
            queue = this.queues[options.queueName].filter(p => p.inProgress);
        } else if (options && typeof options.inProgress !== 'undefined') {
            queue = this.queues[options.queueName].filter(p => !p.inProgress);
        }

        return queue.length;
    }

    async getNamesAfterMemoryCleanUp(): Promise<string[]> {
        return Object.keys(this.queues);
    }
}
