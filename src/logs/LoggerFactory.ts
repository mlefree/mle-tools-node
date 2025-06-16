import {Logger} from './Logger';
import {LoggerPerf} from './LoggerPerf';
import {LoggerLevels} from './LoggerLevels';

export class LoggerFactory {
    private static logger: Logger;

    constructor(
        public active: boolean = true,
        public consoleLevel: LoggerLevels = LoggerLevels.WARN,
        public logLevel: LoggerLevels = LoggerLevels.WARN,
        public notifyUser?: string,
        public notifyPwd?: string,
        public notifyTo?: string
    ) {}

    setUp(
        active: boolean,
        consoleLevel: LoggerLevels,
        logLevel: LoggerLevels,
        notifyUser?: string,
        notifyPwd?: string,
        notifyTo?: string
    ) {
        this.active = active;
        this.consoleLevel = consoleLevel;
        this.logLevel = logLevel;
        this.notifyUser = notifyUser;
        this.notifyPwd = notifyPwd;
        this.notifyTo = notifyTo;

        if (LoggerFactory.logger) {
            LoggerFactory.logger.setup(
                this.active,
                this.consoleLevel,
                this.logLevel,
                this.notifyUser,
                this.notifyPwd,
                this.notifyTo
            );
        }
    }

    getLogger(): Logger {
        if (LoggerFactory.logger) {
            return LoggerFactory.logger;
        }

        const logger = new Logger();
        logger.setup(
            this.active,
            this.consoleLevel,
            this.logLevel,
            this.notifyUser,
            this.notifyPwd,
            this.notifyTo
        );
        LoggerFactory.logger = logger;
        return logger;
    }

    getPerfLogger(name: string = '_'): LoggerPerf {
        return new LoggerPerf(name);
    }
}

export const loggerFactory = new LoggerFactory();
