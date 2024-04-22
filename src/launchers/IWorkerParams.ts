import {IWorkerData} from './IWorkerData';

export interface IWorkerParams {
    workerDescription: string,
    workerInstance: string,
    workerData: IWorkerData,
    workerProcessorPathFile: string,
}
