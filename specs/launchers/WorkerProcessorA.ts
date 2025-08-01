import {promisify} from 'util';
import {
    AbstractWorkerProcessor,
    IConsole,
    IWorkerData,
    Logger,
    loggerFactory,
    MError,
} from '../../src';
import {Config, Input, Inputs} from './WorkerProcessorInterfaces';

const sleep = promisify(setTimeout);

export class WorkerProcessor extends AbstractWorkerProcessor {
    public connected = false;

    constructor(name: string, workerData: IWorkerData, bypassConnection = false) {
        console.log('TEST WorkerProcessorA++', name);
        super(name, workerData, bypassConnection);
    }

    static GetProcesses() {
        return [
            {
                fn: WorkerProcessor.sleep,
                looped: true,
                stopOnFailure: false,
                keepInTheQueue: true,
                inThreadIfPossible: false,
            },
            {
                fn: WorkerProcessor.info,
                looped: true,
                stopOnFailure: true,
                keepInTheQueue: false,
                inThreadIfPossible: true,
            },
            {
                fn: WorkerProcessor.fail,
                looped: false,
                stopOnFailure: true,
                keepInTheQueue: true,
                inThreadIfPossible: true,
            },
            {
                fn: WorkerProcessor.throwError,
                looped: false,
                stopOnFailure: true,
                keepInTheQueue: true,
                inThreadIfPossible: true,
            },
        ];
    }

    // Static processes following pattern:
    //   static async <InSomeWorkerDescription> (config: any, inputs: any, count: number): Promise<boolean>

    static async info(
        config: Config,
        inputs: Inputs,
        logger: IConsole,
        count: number
    ): Promise<boolean> {
        return logger.info('TEST info => ', inputs.messageToWrite);
    }

    static async sleep(
        config: Config,
        inputs: Inputs,
        logger: IConsole,
        count: number
    ): Promise<boolean> {
        logger.info('TEST sleep => ', inputs.messageToWrite);
        await sleep(inputs.timeToSleep);
        return true;
    }

    static async fail(
        config: Config,
        inputs: Inputs,
        logger: IConsole,
        count: number
    ): Promise<boolean> {
        logger.info('TEST fail => ', inputs.messageToWrite);
        await sleep(1);
        return false;
    }

    static async throwError(
        config: Config,
        inputs: Inputs,
        logger: IConsole,
        count: number
    ): Promise<boolean> {
        throw new MError('TEST throwError should see it : ' + inputs.messageToWrite);
    }

    // To implement :

    getProcesses() {
        return WorkerProcessor.GetProcesses();
    }

    protected initLogger(config: any): Logger {
        loggerFactory.setUp({consoleLevel: config.logLevel, logLevel: config.logLevel});
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

    protected async onEnd(
        done: boolean,
        logger: IConsole,
        stats: {
            timeSpentTotal: number;
            timeSpentComputing: number;
            timeSpentWaiting: number;
        }
    ) {
        console.log('TEST WorkerProcessorA-- ', this.name, done, stats);
    }
}
