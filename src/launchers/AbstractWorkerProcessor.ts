import {promisify} from 'util';
import {MError} from '../errors/MError';
import {Tools} from '../tools/Tools';
import {Logger} from '../logs/Logger';
import {ILogger} from '../logs/ILogger';

const sleep = promisify(setTimeout);

export interface IWorkerData {
    config: any,
    input: any,
}

export class AbstractWorkerProcessor {

    protected config: any;
    protected input: any;
    protected logger: Logger;

    constructor(
        protected name: string,
        protected workerData: IWorkerData,
        protected processes: {
            fn: (config: any, inputs: any, logger: ILogger, count: number) => Promise<boolean>,
            looped: boolean,
            stopOnFailure: boolean
        }[],
        protected bypassConnection = false
    ) {
        this.config = workerData?.config ? workerData.config : {};
        this.input = workerData?.input ? workerData.input : {};
    }

    protected static async Loop(asyncFn: (config: any, inputs: any, logger: ILogger, count: number) => Promise<boolean>,
                                count: number,
                                stopOnFailure: boolean,
                                config: any,
                                inputs: any,
                                logger: ILogger) {
        let ok = false;
        let retryLimit = 0;
        while (!ok && retryLimit < count) {
            ok = await asyncFn(config, inputs, logger, retryLimit);
            if (!ok && !stopOnFailure) {
                const timeInMs = 500 + retryLimit * 2000;
                logger.debug('>> Worker wait for next try', asyncFn.name, timeInMs);
                await sleep(timeInMs);
                retryLimit++;
            }
        }
        return ok;
    }

    async launch(): Promise<boolean> {
        this.logger = this.initLogger(this.config);

        let connected = true;
        try {
            if (!this.bypassConnection) {
                connected = await this.connect();
            }
        } catch (err) {
            this.getLogger().error(`>> Worker connection error ${err}`);
        }

        if (!connected) {
            return false;
        }

        const inputs = await this.getInputs(this.config, this.input);
        let possibleProcessNames = this.processes.map(process => process.fn.name);
        const processNameOrdered = Tools.extractOrderedNames(this.getName(), possibleProcessNames);
        this.getLogger().info(`>> Worker processNameOrdered: ${processNameOrdered}`);

        let count = 0;
        let done = true;
        for (const pn of processNameOrdered) {
            const process = this.processes.filter(p => p.fn.name === pn)[0];
            let ok = true;
            try {
                if (process.looped) {
                    ok = await AbstractWorkerProcessor.Loop(process.fn, 5, process.stopOnFailure, this.config, inputs, this.getLogger());
                } else {
                    ok = await process.fn(this.config, inputs, this.getLogger(), count);
                }
            } catch (err) {
                this.getLogger().warn(`>> Worker "${this.getName()}" failed: ${err}`);
                ok = false;
            }

            this.getLogger().info(`>> Worker ${process?.fn?.name} ok: "${ok}"`);

            if (process.stopOnFailure && !ok) {
                done = false;
                break;
            }
            count++;
        }

        this.getLogger().info(`>> Worker ${count} done : "${done}"`);

        if (connected && !this.bypassConnection) {
            await this.disconnect();
        }
        return done;
    }

    getName(): string {
        return '' + this.name;
    }

    protected getLogger(): ILogger {
        if (this.logger) {
            return this.logger;
        } else {
            return console;
        }
    }

    protected initLogger(config: any): Logger {
        throw new MError('to implement');
    }

    protected async getInputs(config: any, input: any): Promise<any> {
        throw new MError('to implement');
    }

    protected async connect(): Promise<boolean> {
        throw new MError('to implement');
    }

    protected async disconnect(): Promise<boolean> {
        throw new MError('to implement');
    }
}

