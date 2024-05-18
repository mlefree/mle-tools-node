import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {LoggerLevels} from './LoggerLevels';
import {ILogger} from './ILogger';
import fs from 'fs';

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

    constructor() {
        this.transports = {};

        this.transports['console'] = new winston.transports.Stream({
            stream: process.stderr,
            level: LOGGER_DEFAULT_LEVEL
        });
        this.transports['file'] = new DailyRotateFile({
            filename: LOGGER_FILE_DIR + '/raain-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: false,
            maxSize: '20m',
            maxFiles: '14d',
            level: LOGGER_DEFAULT_LEVEL,
        });

        this.formats = winston.format.combine(
            winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
            winston.format.printf(({level, message, label, timestamp}) =>
                `${timestamp} ${label || '-'} ${level}: ${message}`)); //  winston.format.simple();

        this.logger = winston.createLogger({
            exitOnError: false,
            format: this.formats,
            transports: [this.transports.console, this.transports.file],
        });

        this.setup(true, LOGGER_DEFAULT_LEVEL, LOGGER_DEFAULT_LEVEL);
    }

    log(level: string, message: any, ...extra: any[]): boolean {
        let done: any;
        if (!this.active) {
            return !!done;
        }

        if (level === 'error') {
            done = this.logger.error(message, extra);
        } else if (level === 'warn') {
            done = this.logger.warn(message, extra);
        } else if (level === 'info') {
            done = this.logger.info(message, extra);
        } else {
            done = this.logger.debug(message, extra);
        }
        return !!done;
    }

    debug(...extra: any[]): boolean {
        let done: any;
        if (this.active) {
            done = this.logger.debug(extra);
        }
        return !!done;
    }

    info(...extra: any[]): boolean {
        let done: any;
        if (this.active &&
            (this.transports.console?.level === LoggerLevels.INFO || this.transports.console?.level === LoggerLevels.DEBUG)) {
            done = this.logger.info(extra);
        }
        return !!done;
    }

    warn(...extra: any[]): boolean {
        let done: any;
        if (this.active) {
            done = this.logger.warn(extra);
        }
        return !!done;
    }

    error(...extra: any[]): boolean {
        let done: any;
        if (this.active) {
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

    setup(active: boolean,
          consoleLevel: LoggerLevels,
          logLevel: LoggerLevels,
          notifyUser?: string,
          notifyPwd?: string,
          notifyTo?: string) {
        this.active = !!active;

        if (this.transports.console) {
            this.transports.console.level = consoleLevel;
        }

        if (this.transports.file) {
            this.transports.file.level = logLevel;
        }

        this.notifyUser = notifyUser;
        this.notifyPwd = notifyPwd;
        this.notifyTo = notifyTo ? JSON.parse(notifyTo) : notifyUser;
    }

    async notify(subject: string, text: string) {
        let done: any;

        if (this.active && this.notifyUser && this.notifyPwd) {
            const options = {
                user: this.notifyUser, pass: this.notifyPwd, to: this.notifyTo,  // [ 'user1@gmail.com', 'user2@gmail.com' ]
                subject, text,
            };
            const send = require('gmail-send')(options);
            try {
                const {result, full} = await send(options);
                done = result;
            } catch (error) {
                console.error('MAIL ERROR:', error);
            }
        }

        return !!done;
    }

    readLastLogs(parentPath: string): string[] {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
        const firstPartOfDate = now.toISOString().split('T')[0];
        const secondPartOfDate = now.toISOString().split('T')[1].split(':')[0];
        const formattedDate = firstPartOfDate + '-' + secondPartOfDate;
        const lastLogFilename = parentPath + LOGGER_FILE_DIR + '/raain-' + formattedDate + '.log';
        const contents = fs.readFileSync(lastLogFilename, 'utf8');
        return contents.split(/\r?\n/);
    }

    getLevel(): LoggerLevels {
        if (this.transports.console?.level) {
            return this.transports.console.level;
        }

        return LOGGER_DEFAULT_LEVEL;
    }
}
