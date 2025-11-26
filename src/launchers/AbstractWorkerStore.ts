import {MError} from '../errors';
import {IWorkerParams} from './IWorkerParams';

export class AbstractWorkerStore {
    async lastActivity(): Promise<{name: string; date: Date} | null> {
        throw new MError('Not implemented');
    }

    async push(params: IWorkerParams): Promise<string | undefined> {
        throw new MError('Not implemented');
    }

    async take(names: string[]): Promise<IWorkerParams | undefined> {
        throw new MError('Not implemented');
    }

    async release(params: IWorkerParams, shouldKeepInQueue: boolean): Promise<void> {
        throw new MError('Not implemented');
    }

    async remove(params: IWorkerParams): Promise<void> {
        throw new MError('Not implemented');
    }

    async size(options?: {names?: string[]; inProgress?: boolean}): Promise<number> {
        throw new MError('Not implemented');
    }

    async onStop(): Promise<void> {
        throw new MError('Not implemented');
    }

    async getNamesAfterMemoryCleanUp(): Promise<string[][]> {
        throw new MError('Not implemented');
    }

    protected getQueueName(names?: string[]) {
        if (!names) {
            return '';
        }

        return names.join('-');
    }

    protected extractQueueName(names?: string) {
        if (!names) {
            return [];
        }

        return names.split('-');
    }

    protected getKey(params: IWorkerParams) {
        if (params?.workerData?.key) {
            return params.workerData.key;
        }

        if (params?.workerData?.id) {
            return params.workerData.id;
        }

        return (
            JSON.stringify(params.workerData.namesToLaunch) +
            JSON.stringify(params.workerData.input)
        );
    }
}
