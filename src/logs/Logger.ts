import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {LoggerLevels} from './LoggerLevels';
import {ILogger, ILoggerOptions} from './ILogger';
import fs from 'fs';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import {threadId} from 'node:worker_threads';

const LOGGER_DEFAULT_LEVEL = LoggerLevels.WARN;
const LOGGER_FILE_DIR = '.logs';

export class Logger implements ILogger {
    private readonly transports: any;
    private readonly formats: any;
    private readonly logger: any;
    private active: boolean;
    private notifyUser: any;
    private notifyPwd: any;
    private notifyTo: any;
    private filters: object;

    constructor() {
        this.transports = {};
        this.filters = {};

        this.transports['console'] = new winston.transports.Stream({
            stream: process.stderr,
            level: LOGGER_DEFAULT_LEVEL,
        });
        this.transports['file'] = new DailyRotateFile({
            filename: LOGGER_FILE_DIR + '/log-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: false,
            maxSize: '20m',
            maxFiles: '14d',
            level: LOGGER_DEFAULT_LEVEL,
        });

        this.formats = winston.format.combine(
            winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
            winston.format.splat(),
            winston.format.printf(
                ({level, message, label, timestamp}) =>
                    `${timestamp}|${process.pid}.${threadId} ${label || '-'} ${level}: ${message}`
            ),
            winston.format.colorize({all: true})
        ); //  winston.format.simple();

        this.logger = winston.createLogger({
            exitOnError: false,
            format: this.formats,
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
        if (
            this.active &&
            (this.transports.console?.level === LoggerLevels.INFO ||
                this.transports.console?.level === LoggerLevels.DEBUG) &&
            !this.shouldBeFiltered(LoggerLevels.INFO, '' + extra[0])
        ) {
            done = this.logger.info(extra);
            // done = this.logger.info(JSON.stringify(this.filters) + extra.join(' '));
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

    readLastLogs(parentPath: string): string[] {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const firstPartOfDate = now.toISOString().split('T')[0];
        const secondPartOfDate = now.toISOString().split('T')[1].split(':')[0];
        const formattedDate = firstPartOfDate + '-' + secondPartOfDate;

        const lastLogFilename = join(parentPath, LOGGER_FILE_DIR, '/log-' + formattedDate + '.log');
        const contents = fs.readFileSync(lastLogFilename, 'utf8');
        return contents.split(/\r?\n/);
    }

    getLevel(): LoggerLevels {
        if (this.transports.console?.level) {
            return this.transports.console.level;
        }

        return LOGGER_DEFAULT_LEVEL;
    }

    async erase(parentPath: string) {
        try {
            const dirToRemove = join(parentPath, LOGGER_FILE_DIR);
            await rm(dirToRemove, {recursive: true, force: true});
        } catch (ignored) {
            // Ignore errors when removing log directory, as it might not exist
        }
    }

    protected shouldBeFiltered(level: string, message: string): boolean {
        if (this.filters[level] && this.filters[level].length > 0) {
            return message.indexOf(this.filters[level]) < 0;
        }

        return false;
    }
}
