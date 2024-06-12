import {MError} from '../errors';

export class AbstractWorkerStore {

    async push(queueName: string, params: any) {
        throw new MError('Not implemented');
    };

    async take(queueName: string): Promise<any> {
        throw new MError('Not implemented');
    };

    async release(queueName: string, params: any): Promise<void> {
        throw new MError('Not implemented');
    };

    async remove(queueName: string, params: any): Promise<void> {
        throw new MError('Not implemented');
    };

    async size(queueName: string): Promise<number> {
        throw new MError('Not implemented');
    };
}
