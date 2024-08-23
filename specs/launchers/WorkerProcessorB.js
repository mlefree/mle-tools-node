const {promisify} = require('util');
const {AbstractWorkerProcessor, loggerFactory, MError} = require('../../dist');

const sleep = promisify(setTimeout);

class WorkerProcessor extends AbstractWorkerProcessor {

    constructor(
        name,
        workerData,
        bypassConnection = false
    ) {
        console.log('WorkerProcessorB++', name);
        super(name, workerData, bypassConnection);
    }

    static GetProcesses() {
        return [
            {
                fn: WorkerProcessor.sleep,
                looped: true,
                stopOnFailure: false,
                keepInTheQueue: true,
                inThreadIfPossible: false
            },
            {
                fn: WorkerProcessor.info,
                looped: true,
                stopOnFailure: true,
                keepInTheQueue: false,
                inThreadIfPossible: true
            },
            {
                fn: WorkerProcessor.fail,
                looped: false,
                stopOnFailure: true,
                keepInTheQueue: true,
                inThreadIfPossible: true
            },
            {
                fn: WorkerProcessor.throwError,
                looped: false,
                stopOnFailure: true,
                keepInTheQueue: true,
                inThreadIfPossible: true
            },
        ];
    }

    // Static processes following pattern:
    //   static async <InSomeWorkerDescription> (config: any, inputs: any, count: number): Promise<boolean>

    static async info(config, inputs, logger, count) {
        return logger.info('infoB => ', inputs.messageToWrite);
    }

    static async sleep(config, inputs, logger, count) {
        logger.info('sleepB => ', inputs.messageToWrite);
        await sleep(inputs.timeToSleep);
        return true;
    }

    static async fail(config, inputs, logger, count) {
        logger.info('failB => ', inputs.messageToWrite);
        await sleep(1);
        return false;
    }

    static async throwError(config, inputs, logger, count) {
        throw new MError('throwErrorB should see it : ' + inputs.messageToWrite);
    }

    // To implement :

    getProcesses() {
        return WorkerProcessor.GetProcesses();
    }

    initLogger(config) {
        loggerFactory.setUp(true, config.logLevel, config.logLevel);
        return loggerFactory.getLogger();
    }

    async getInputs(config, input) {
        return {
            timeToSleep: input.count * config.time,
            messageToWrite: config.label + ' count:' + input.count + ' time:' + config.time,
        };
    }

    async connect() {
        return true;
    }

    async disconnect() {
        return true;
    }

    async onEnd(done, logger, stats) {
        console.log('WorkerProcessorB--', this.name, done, stats);
    }
}

module.exports = {WorkerProcessor};
