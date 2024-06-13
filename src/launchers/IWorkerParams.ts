import {IWorkerData} from './IWorkerData';

export interface IWorkerParams {
    workerProcesses: string[],
    workerInstance: string,
    workerData: IWorkerData,
    workerProcessorPathFile: string,
}
