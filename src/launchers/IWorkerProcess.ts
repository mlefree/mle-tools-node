import {IConsole} from '../logger';

export interface IWorkerProcess {
    fn: (config: any, inputs: any, logger: IConsole, count: number) => Promise<boolean>;
    looped: boolean; // Looping step in case of failing
    stopOnFailure: boolean; // Interrupt the processor's chain if fail
    keepInTheQueue: boolean; // Keep in the Queue's store
    inThreadIfPossible: boolean; // If one step mention it => process needTread
}
