import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {LoggerLevels} from './LoggerLevels';
import {ILogger, ILoggerOptions} from './ILogger';
import {threadId} from 'node:worker_threads';

const LOGGER_DEFAULT_LEVEL = LoggerLevels.WARN;
export const LOGGER_FILE_DIR = '.logs';

export class Logger implements ILogger {
    private readonly transports: any;
    private readonly formats: any;
    private readonly logger: any;
    private active: boolean;
    private notifyUser: any;
    private notifyPwd: any;
    private notifyTo: any;
    private filters: object;

    constructor(label?: string) {
        this.transports = {};
        this.filters = {};

        const baseFormat = this.createBaseFormat(label || '');
        const consoleFormat = this.createConsoleFormat(label || '');

        this.transports['console'] = new winston.transports.Stream({
            stream: process.stderr,
            level: LOGGER_DEFAULT_LEVEL,
            format: consoleFormat,
        });

        const threadSpecificFilename = `${LOGGER_FILE_DIR}/log-%DATE%-${process.pid}.${threadId}.log`;

        this.transports['file'] = new DailyRotateFile({
            filename: threadSpecificFilename,
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: false,
            maxSize: '20m',
            maxFiles: '14d',
            level: LOGGER_DEFAULT_LEVEL,
            format: baseFormat,
            options: {flags: 'a', highWaterMark: 0}, // Force immediate writes
            handleExceptions: true,
            handleRejections: true,
        }).on('error', (error) => {
            console.error('Logger file transport error:', error);
        });

        this.logger = winston.createLogger({
            exitOnError: false,
            transports: [this.transports.console, this.transports.file],
        });

        this.setup();
    }

    log(level: LoggerLevels, ...args: any[]): boolean {
        let done: any;
        if (!this.active || this.shouldBeFiltered(level, '' + args[0])) {
            return !!done;
        }

        // For console output, we skip the level parameter and pass only the actual arguments
        if (level === LoggerLevels.ERROR) {
            done = this.logger.error(args);
        } else if (level === LoggerLevels.WARN) {
            done = this.logger.warn(args);
        } else if (level === LoggerLevels.INFO) {
            done = this.logger.info(args);
        } else {
            done = this.logger.debug(args);
        }
        return !!done;
    }

    debug(...extra: any[]): boolean {
        let done: any;
        if (this.active && !this.shouldBeFiltered(LoggerLevels.DEBUG, '' + extra[0])) {
            done = this.logger.debug(extra);
        }
        return !!done;
    }

    info(...extra: any[]): boolean {
        let done: any;
        const filterToRemoveUselessAccess = !(
            this.transports.console?.level === LoggerLevels.INFO ||
            this.transports.console?.level === LoggerLevels.DEBUG
        );
        if (
            this.active &&
            !filterToRemoveUselessAccess &&
            !this.shouldBeFiltered(LoggerLevels.INFO, '' + extra[0])
        ) {
            done = this.logger.info(extra);
        }
        return !!done;
    }

    warn(...extra: any[]): boolean {
        let done: any;
        if (this.active && !this.shouldBeFiltered(LoggerLevels.WARN, '' + extra[0])) {
            done = this.logger.warn(extra);
            // done = this.logger.info(JSON.stringify(this.filters) + extra.join(' '));
        }
        return !!done;
    }

    error(...extra: any[]): boolean {
        let done: any;
        if (this.active && !this.shouldBeFiltered(LoggerLevels.ERROR, '' + extra[0])) {
            done = this.logger.error(extra);
        }
        return !!done;
    }

    write(...extra: any[]): boolean {
        let done: any;
        if (this.active) {
            done = this.logger.debug(extra);
        }
        return !!done;
    }

    disableAll() {
        this.active = false;
    }

    reset() {
        this.active = true;

        if (this.transports.console) {
            this.transports.console.level = LOGGER_DEFAULT_LEVEL;
        }

        if (this.transports.file) {
            this.transports.file.level = LOGGER_DEFAULT_LEVEL;
        }
    }

    setup(options: ILoggerOptions = {}) {
        this.active =
            typeof options.active === 'undefined'
                ? typeof this.active === 'undefined'
                    ? true
                    : this.active
                : !!options.active;
        this.filters = (options.filters || this.filters) ?? {};

        // Update winston format label if provided
        if (typeof options.label !== 'undefined') {
            const baseFormat = this.createBaseFormat(options.label);
            const consoleFormat = this.createConsoleFormat(options.label);

            // Update formats for existing transports
            if (this.transports.console) {
                this.transports.console.format = consoleFormat;
            }
            if (this.transports.file) {
                this.transports.file.format = baseFormat;
            }
        }

        if (this.transports.console) {
            this.transports.console.level =
                typeof options.consoleLevel === 'undefined'
                    ? this.transports.console.level || LOGGER_DEFAULT_LEVEL
                    : options.consoleLevel;
        }

        if (this.transports.file) {
            this.transports.file.level =
                typeof options.logLevel === 'undefined'
                    ? this.transports.file.level || LOGGER_DEFAULT_LEVEL
                    : options.logLevel;
        }

        this.notifyUser = (options.notifyUser || this.notifyUser) ?? null;
        this.notifyPwd = (options.notifyPwd || this.notifyPwd) ?? null;
        this.notifyTo =
            options.notifyTo || this.notifyTo
                ? JSON.parse(options.notifyTo || this.notifyTo)
                : options.notifyUser;
    }

    async notify(subject: string, text: string) {
        let done: any;

        if (this.active && this.notifyUser && this.notifyPwd) {
            const options = {
                user: this.notifyUser,
                pass: this.notifyPwd,
                to: this.notifyTo, // [ 'user1@gmail.com', 'user2@gmail.com' ]
                subject,
                text,
            };
            const send = require('gmail-send')(options);
            try {
                const {result, full} = await send(options);
                done = result;
            } catch (error) {
                console.error('[mtn] MAIL ERROR:', error);
            }
        }

        return !!done;
    }

    getLevel(): LoggerLevels {
        if (this.transports.console?.level) {
            return this.transports.console.level;
        }

        return LOGGER_DEFAULT_LEVEL;
    }

    protected shouldBeFiltered(level: string, message: string): boolean {
        if (this.filters[level] && this.filters[level].length > 0) {
            return message.indexOf(this.filters[level]) < 0;
        }

        return false;
    }

    private createBaseFormat(label: string) {
        return winston.format.combine(
            winston.format.label({label}),
            winston.format.timestamp(),
            winston.format.splat(),
            winston.format.printf(({level, message, label, timestamp}) => {
                // Pad process.pid + threadId to consistent width (12 characters)
                const pidThreadId = `${process.pid}.${threadId}`;
                const paddedPidThreadId = pidThreadId.padEnd(12, ' ');

                // Pad level to consistent width (5 characters)
                const paddedLevel = level.padEnd(5, ' ');

                return `${timestamp}|${paddedPidThreadId}|${paddedLevel}:${label ? ' [' + label + '] ' : ' '}${message}`;
            })
        );
    }

    private createConsoleFormat(label: string) {
        return winston.format.combine(
            this.createBaseFormat(label),
            winston.format.colorize({all: true})
        );
    }
}
