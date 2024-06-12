import {promisify} from 'util';
import {MError} from '../errors';
import {Tools} from '../tools';
import {ILogger, Logger, LoggerLevels} from '../logs';
import {IWorkerData} from './IWorkerData';

const sleep = promisify(setTimeout);

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
            stopOnFailure: boolean,
            keepInTheQueue: boolean,
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
        const possibleProcessNames = this.processes.map(process => process.fn.name);
        const processNameOrdered = Tools.extractOrderedNames(this.getName(), possibleProcessNames);
        this.getLogger().info(`>> Worker processNameOrdered: ${processNameOrdered}`);

        let count = 0;
        let anotherTry = false;
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

                if (!ok) {
                    allDone = false;
                    anotherTry = process.keepInTheQueue;
                }
            } catch (err) {
                this.getLogger().warn(`>> Worker "${this.getName()}" failed: ${err} >> stack: ${err.stack}`);
                ok = false;
                allDone = false;
                if (err.code === 404) {
                    anotherTry = process.keepInTheQueue;
                }
            }

            this.getLogger().info(`>> Worker ${process?.fn?.name} ok: "${ok}"`);

            if (process.stopOnFailure && !ok) {
                break;
            }
            count++;
        }

        this.getLogger().info(`>> Worker ${count} finished, ${allDone}... anotherTry:"${anotherTry}"`);
        const msg = await this.onEnd(allDone, await this.buildStats());

        if (connected && !this.bypassConnection) {
            await this.disconnect();
        }

        return anotherTry;
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
            console['getLevel'] = () => {
                return LoggerLevels.DEBUG
            };
            return console as any;
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
