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

        this.queues[queueName].push(params);
    }

    async take(queueName: string): Promise<any> {
        return this.queues[queueName].splice(0, 1)[0];
    }

}
