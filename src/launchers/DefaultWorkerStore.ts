import {AbstractWorkerStore} from './AbstractWorkerStore';
import {IWorkerParams} from './IWorkerParams';
import {loggerFactory} from '../logger';

type QueueElement = {key: string; params: IWorkerParams; inProgress: boolean};

export class DefaultWorkerStore extends AbstractWorkerStore {
    private queues = {};

    constructor() {
        super();
        this.removeAll();
    }

    async push(params: IWorkerParams): Promise<void> {
        const queueName = this.getQueueName(params.workerData.namesToLaunch);
        if (!this.queues[queueName]) {
            this.queues[queueName] = [];
        }

        const key = this.getKey(params);
        if (!params.workerData.id) {
            params.workerData.id = key;
        }
        if (!params.workerData.idsToWait?.length) {
            params.workerData.idsToWait = [];
        }
        if (!params.workerData.namesToLaunch?.length) {
            params.workerData.namesToLaunch = [];
        }

        const alreadyThere = this.queues[queueName].filter((q) => q.key === key);
        if (alreadyThere.length === 0) {
            const queueElement: QueueElement = {key, params, inProgress: false};
            this.queues[queueName].push(queueElement);
        }
    }

    async take(names: string[]): Promise<IWorkerParams> {
        const queueName = this.getQueueName(names);
        const queue: QueueElement[] = this.queues[queueName] ? this.queues[queueName] : [];
        const waitingElements: QueueElement[] = queue.filter((e: QueueElement) => !e.inProgress);
        loggerFactory
            .getLogger()
            .info(`(mtn) WorkerStore - take ${queueName} ${waitingElements.length}`);

        let firstToTake: QueueElement;
        let workerParams: IWorkerParams;
        for (const element of waitingElements) {
            const iWorkerParams = element.params;

            // In case of workerIdsToWait, if any of ids is still present, continue to test next
            if (iWorkerParams.workerData.idsToWait?.length) {
                let idsToWaitFound: QueueElement[] = [];
                for (const queue of Object.values<QueueElement[]>(this.queues)) {
                    idsToWaitFound = idsToWaitFound.concat(
                        queue.filter(
                            (e: QueueElement) =>
                                iWorkerParams.workerData.idsToWait?.indexOf(
                                    e.params.workerData.id
                                ) >= 0
                        )
                    );
                }
                if (idsToWaitFound.length > 0) {
                    continue;
                }
            }

            firstToTake = element;
            workerParams = iWorkerParams;
            break;
        }

        if (firstToTake) {
            firstToTake.inProgress = true;
        }

        return workerParams;
    }

    async release(params: IWorkerParams, _shouldKeepInQueue: boolean): Promise<void> {
        const queueName = this.getQueueName(params.workerData.namesToLaunch);
        if (typeof this.queues[queueName] === 'undefined') {
            return;
        }

        let pos = -1;
        const key = this.getKey(params);
        for (const [index, value] of this.queues[queueName].entries()) {
            const val: QueueElement = value;
            if (val.key === key) {
                pos = index;
                break;
            }
        }

        loggerFactory.getLogger().debug(`(mtn) WorkerStore - release ${queueName} ${pos}`);
        if (pos > -1) {
            this.queues[queueName][pos].inProgress = false;
        }
    }

    async remove(params: IWorkerParams): Promise<void> {
        const queueName = this.getQueueName(params.workerData.namesToLaunch);
        let pos = -1;
        const key = this.getKey(params);
        for (const [index, value] of this.queues[queueName].entries()) {
            const val: QueueElement = value;
            if (val.key === key) {
                pos = index;
                break;
            }
        }

        loggerFactory.getLogger().debug(`(mtn) WorkerStore - remove ${queueName} ${pos}`);
        if (pos > -1) {
            this.queues[queueName].splice(pos, 1);
        }
    }

    removeAll() {
        this.queues = {};
    }

    async size(options?: {names?: string[]; inProgress?: boolean}): Promise<number> {
        const queueName = this.getQueueName(options?.names);
        if (queueName && !this.queues[queueName]) {
            loggerFactory.getLogger().error('(mtn) WorkerStore queues issue:', this.queues);
            return -1;
        }

        if (!queueName) {
            return (Object.values(this.queues) as QueueElement[][]).reduce(
                (p: number, e: QueueElement[]) => {
                    let arr = e;
                    if (options?.inProgress) {
                        arr = e.filter((p) => p.inProgress);
                    } else if (options && typeof options.inProgress !== 'undefined') {
                        arr = e.filter((p) => !p.inProgress);
                    }
                    return p + arr.length;
                },
                0
            );
        }

        let queue = this.queues[queueName];
        if (options?.inProgress) {
            queue = this.queues[queueName].filter((p) => p.inProgress);
        } else if (options && typeof options.inProgress !== 'undefined') {
            queue = this.queues[queueName].filter((p) => !p.inProgress);
        }

        return queue.length;
    }

    async getNamesAfterMemoryCleanUp(): Promise<string[][]> {
        const queueNames = Object.keys(this.queues);
        return queueNames.map((n) => this.extractQueueName(n));
    }
}
