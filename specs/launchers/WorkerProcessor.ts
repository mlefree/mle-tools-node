import {promisify} from 'util';
import {AbstractWorkerProcessor, cacheFactory, ILogger, IWorkerData, Logger, loggerFactory, LoggerLevels, MError} from '../../src';

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
        super(name, workerData, bypassConnection);
    }

    static GetProcesses() {
        return [
            {fn: WorkerProcessor.sleep, looped: false, stopOnFailure: false, keepInTheQueue: true, inThreadIfPossible: false},
            {fn: WorkerProcessor.info, looped: false, stopOnFailure: true, keepInTheQueue: false, inThreadIfPossible: true},
            {fn: WorkerProcessor.fail, looped: true, stopOnFailure: true, keepInTheQueue: false, inThreadIfPossible: true},
            {fn: WorkerProcessor.throwError, looped: true, stopOnFailure: true, keepInTheQueue: true, inThreadIfPossible: true},
        ];
    }

    static async sleep(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        const result = await cacheFactory.set('test' + count, inputs.messageToWrite);
        logger.info('sleep', inputs.messageToWrite);
        await sleep(inputs.timeToSleep);
        return true;
    }

    // Static processes following pattern:
    //   static async <InSomeWorkerDescription> (config: any, inputs: any, count: number): Promise<boolean>

    static async info(config: Config, inputs: Inputs, logger: ILogger, count: number): Promise<boolean> {
        const cached = await cacheFactory.get('test' + count);
        return logger.info('info', inputs.messageToWrite, cached);
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

    getProcesses() {
        return WorkerProcessor.GetProcesses();
    }

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
