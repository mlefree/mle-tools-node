import {MError} from '../errors/MError';

export class AbstractWorkerStore {

    async push(queueName: string, params: any) {
        throw new MError('Not implemented');
    };

    async take(queueName: string): Promise<any> {
        throw new MError('Not implemented');
    };
}
