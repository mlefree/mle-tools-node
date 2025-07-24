import {Logger} from './Logger';
import {LoggerPerf} from './LoggerPerf';
import {LoggerLevels} from './LoggerLevels';
import {ILoggerOptions} from './ILogger';

const defaultOptions = {
    active: true,
    consoleLevel: LoggerLevels.WARN,
    logLevel: LoggerLevels.WARN,
    notifyUser: null,
    notifyPwd: null,
    filters: {},
};

export class LoggerFactory {
    protected logger: Logger;
    protected loggerOptions: ILoggerOptions;

    constructor() {
        this.loggerOptions = defaultOptions;
    }

    setUp(options: ILoggerOptions = defaultOptions) {
        this.loggerOptions = options;

        if (this.logger) {
            this.logger.setup(options);
        }
    }

    getLogger(): Logger {
        if (this.logger) {
            return this.logger;
        }

        const logger = new Logger();
        logger.setup(this.loggerOptions);
        this.logger = logger;
        return logger;
    }

    getPerfLogger(name: string = '_'): LoggerPerf {
        return new LoggerPerf(name);
    }
}

export const loggerFactory = new LoggerFactory();
