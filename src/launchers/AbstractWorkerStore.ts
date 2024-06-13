import {MError} from '../errors';
import {IWorkerParams} from './IWorkerParams';

export class AbstractWorkerStore {

    async push(queueName: string, params: IWorkerParams) {
        throw new MError('Not implemented');
    };

    async take(queueName: string): Promise<IWorkerParams> {
        throw new MError('Not implemented');
    };

    async release(queueName: string, params: IWorkerParams): Promise<void> {
        throw new MError('Not implemented');
    };

    async remove(queueName: string, params: IWorkerParams): Promise<void> {
        throw new MError('Not implemented');
    };

    async size(options?: { queueName?: string, inProgress?: boolean }): Promise<number> {
        throw new MError('Not implemented');
    };

    async getNamesAfterMemoryCleanUp(): Promise<string[]> {
        throw new MError('Not implemented');
    }
}
