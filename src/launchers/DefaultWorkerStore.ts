import {AbstractWorkerStore} from './AbstractWorkerStore';

export class DefaultWorkerStore extends AbstractWorkerStore {
    private queues = {};

    constructor() {
        super();
    }

    async push(queueName: string, params: any): Promise<void> {
        if (!this.queues[queueName]) {
            this.queues[queueName] = [];
        }

        this.queues[queueName].push({params, inProgress: false});
    }

    async take(queueName: string): Promise<any> {
        const waiting = this.queues[queueName]
            .filter(e => !e.inProgress);

        if (waiting.length > 0) {
            const firstWaiting = waiting[0];
            firstWaiting.inProgress = true;
            return firstWaiting.params;
        }

        return null;
    }

    async release(queueName: string, params: any): Promise<void> {
        let pos = -1;
        for (const [index, value] of this.queues[queueName].entries()) {
            if (value.params === params) {
                pos = index;
                break;
            }
        }
        if (pos > -1) {
            this.queues[queueName][pos].inProgress = false;
        }
    }

    async remove(queueName: string, params: any): Promise<void> {
        let pos = -1;
        for (const [index, value] of this.queues[queueName].entries()) {
            if (value.params === params) {
                pos = index;
                break;
            }
        }
        if (pos > -1) {
            this.queues[queueName].splice(pos, 1);
        }
    }


    async size(queueName: string): Promise<number> {
        if (!this.queues[queueName]) {
            console.error('### WorkerStore queues issue:', this.queues);
            return -1;
        }

        return this.queues[queueName].length;
    }
}
