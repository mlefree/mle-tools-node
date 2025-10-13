import {IConsole} from '../logger';

export interface IWorkerProcess {
    fn: (config: any, inputs: any, logger: IConsole, count: number) => Promise<boolean>; // Function to call
    name?: string; // Optional custom name for the process (defaults to fn.name)
    looped: boolean; // If true, loop N Times until "fn" returns OK (true)
    stopOnFailure: boolean; // If true and method returns NOK => break
    keepInTheQueue: boolean; // If true, will attempt another try if possible (keep in the queue)
    inThreadIfPossible: boolean; // If true, try to launch parent process in Thread. If one step mention it => process needTread
}
