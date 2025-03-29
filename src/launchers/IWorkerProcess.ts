import {IConsole} from '../logs';

export interface IWorkerProcess {
    fn: (config: any, inputs: any, logger: IConsole, count: number) => Promise<boolean>,
    looped: boolean,
    stopOnFailure: boolean,
    keepInTheQueue: boolean,
    inThreadIfPossible: boolean,
}
