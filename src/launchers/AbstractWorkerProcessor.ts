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

    protected static NeedToStop: boolean;
    protected config: any;
    protected input: any;
    protected logger: Logger;
    private perfBegin: Date;
    private perfTimeSpentComputing: number;
    private perfTimeSpentWaiting: number;

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
        this.perfBegin = new Date();
        this.perfTimeSpentComputing = 0;
        this.perfTimeSpentWaiting = 0;
    }

    static CheckIfItShouldStop(): boolean {
        return AbstractWorkerProcessor.NeedToStop;
    }

    static ForceStop(stop = true) {
        AbstractWorkerProcessor.NeedToStop = stop;
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
        let allDone = true;
        for (const pn of processNameOrdered) {
            const process = this.processes.filter(p => p.fn.name === pn)[0];
            let ok = true;
            try {
                if (process.looped) {
                    ok = await this.loop(process.fn, 10, process.stopOnFailure, inputs);
                } else {
                    const begin = new Date();
                    ok = await process.fn(this.config, inputs, this.getLogger(), count);
                    const end = new Date();
                    this.perfTimeSpentComputing += end.getTime() - begin.getTime();
                }
            } catch (err) {
                this.getLogger().warn(`>> Worker "${this.getName()}" failed: ${err} >> stack: ${err.stack}`);
                ok = false;
            }

            this.getLogger().info(`>> Worker ${process?.fn?.name} ok: "${ok}"`);

            if (!ok) {
                allDone = false;
            }

            if (process.stopOnFailure && !ok) {
                break;
            }
            count++;
        }

        this.getLogger().info(`>> Worker ${count} finished, allDone:"${allDone}"`);
        const msg = await this.onEnd(allDone, await this.buildStats());

        if (connected && !this.bypassConnection) {
            await this.disconnect();
        }

        return allDone;
    }

    getName(): string {
        return '' + this.name;
    }

    protected async loop(asyncFn: (config: any, inputs: any, logger: ILogger, count: number) => Promise<boolean>,
                         count: number,
                         stopOnFailure: boolean,
                         inputs: any) {
        let ok = false;
        let retryLimit = 0;
        while (!ok && retryLimit < count && !AbstractWorkerProcessor.CheckIfItShouldStop()) {

            const dateA = new Date();
            ok = await asyncFn(this.config, inputs, this.logger, retryLimit);
            const dateB = new Date();
            this.perfTimeSpentComputing += dateB.getTime() - dateA.getTime();

            if (!ok && stopOnFailure) {
                break;
            }

            if (!ok) {
                const timeInMs = 500 + retryLimit * 2000;
                this.logger.debug('>> Worker wait for next try', asyncFn.name, timeInMs);
                await sleep(timeInMs);
                retryLimit++;
                const dateC = new Date();
                this.perfTimeSpentWaiting += dateC.getTime() - dateB.getTime();
            }
        }
        return ok;
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

    protected async onEnd(allDone: boolean, stats: {
        timeSpentTotal: number,
        timeSpentComputing: number,
        timeSpentWaiting: number
    }) {
        // to override
    }

    private async buildStats(): Promise<{
        timeSpentTotal: number,
        timeSpentComputing: number,
        timeSpentWaiting: number
    }> {
        const end = new Date();
        return {
            timeSpentTotal: end.getTime() - this.perfBegin.getTime(),
            timeSpentComputing: this.perfTimeSpentComputing,
            timeSpentWaiting: this.perfTimeSpentWaiting
        };
    }
}

