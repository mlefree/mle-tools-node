import {promisify} from 'util';
import {AbstractWorkerProcessor, ILogger, IWorkerData, Logger, loggerFactory, LoggerLevels, MError} from '../../src';

const sleep = promisify(setTimeout);

export interface Config {
    label: string;
    time: number;
    logLevel: LoggerLevels;
}

export interface Input {
    count: number;
}

export interface Inputs {
    timeToSleep: number;
    messageToWrite: string;
}

export class WorkerProcessor extends AbstractWorkerProcessor {

    public connected = false;

    constructor(
        name: string,
        workerData: IWorkerData,
        bypassConnection = false
    ) {
        const processes = [
            {fn: WorkerProcessor.sleep, looped: false, stopOnFailure: false, keepInTheQueue: true},
            {fn: WorkerProcessor.info, looped: false, stopOnFailure: true, keepInTheQueue: false},
            {fn: WorkerProcessor.fail, looped: true, stopOnFailure: true, keepInTheQueue: false},
            {fn: WorkerProcessor.throwError, looped: true, stopOnFailure: true, keepInTheQueue: true},
        ];
        super(name, workerData, processes, bypassConnection);
    }

    // Static processes following pattern:
    //   static async <InSomeWorkerDescription> (config: any, inputs: any, count: number): Promise<boolean>

    static async sleep(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        logger.info('sleep', inputs.messageToWrite);
        await sleep(inputs.timeToSleep);
        return true;
    }

    static async info(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        return logger.info('info', inputs.messageToWrite);
    }

    static async fail(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        const done = logger.info('fail', inputs.messageToWrite);
        await sleep(1);
        return false;
    }

    static async throwError(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        throw new MError('test should see it : ' + inputs.messageToWrite);
    }

    // To implement :

    protected initLogger(config: any): Logger {
        loggerFactory.setUp(true, config.logLevel, config.logLevel);
        return loggerFactory.getLogger();
    }

    protected async getInputs(config: Config, input: Input): Promise<Inputs> {
        return {
            timeToSleep: input.count * config.time,
            messageToWrite: config.label + ' count:' + input.count + ' time:' + config.time,
        };
    }

    protected async connect(): Promise<boolean> {
        // implement DB connection for example
        this.connected = true;
        return this.connected;
    }

    protected async disconnect(): Promise<boolean> {
        // implement DB disconnection for example
        this.connected = false;
        return this.connected;
    }

    protected async onEnd(done: boolean, stats: {
        timeSpentTotal: number,
        timeSpentComputing: number,
        timeSpentWaiting: number
    }) {
        console.error('### WorkerProcessor onEnd :', done, stats);
    }


}
