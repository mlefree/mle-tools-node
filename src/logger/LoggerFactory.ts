import {Logger, LOGGER_FILE_DIR} from './Logger';
import {LoggerPerf} from './LoggerPerf';
import {LoggerLevels} from './LoggerLevels';
import {ILoggerOptions} from './ILogger';
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import fs from 'fs';

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

    setUp(options: ILoggerOptions = {}) {
        this.loggerOptions = {...this.loggerOptions, ...options};
        this.logger?.setup(options);
    }

    getLogger(): Logger {
        if (this.logger) {
            return this.logger;
        }

        const logger = new Logger(this.loggerOptions.label);
        logger.setup(this.loggerOptions);
        return logger;
    }

    getPerfLogger(name: string = '_'): LoggerPerf {
        return new LoggerPerf(name);
    }

    async erase() {
        try {
            const parentPath = this.loggerOptions.path ?? process.cwd();
            const dirToRemove = join(parentPath, LOGGER_FILE_DIR);
            await rm(dirToRemove, {recursive: true, force: true});
        } catch (ignored) {
            // Ignore errors when removing log directory, as it might not exist
        }
    }

    readLastLogs(parentPath?: string): string[] {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const firstPartOfDate = now.toISOString().split('T')[0];
        const secondPartOfDate = now.toISOString().split('T')[1].split(':')[0];
        const formattedDate = firstPartOfDate + '-' + secondPartOfDate;

        const pP = parentPath ?? this.loggerOptions.path ?? process.cwd();
        const logDir = join(pP, LOGGER_FILE_DIR);
        const logFilePrefix = 'log-' + formattedDate;

        try {
            // Check if log directory exists
            if (!fs.existsSync(logDir)) {
                return [];
            }

            // Find all log files that match the current date pattern
            const files = fs.readdirSync(logDir);
            const matchingFiles = files.filter(
                (file) => file.startsWith(logFilePrefix) && file.endsWith('.log')
            );

            if (matchingFiles.length === 0) {
                return [];
            }

            // Read and combine contents from all matching log files
            let allLines: string[] = [];
            for (const file of matchingFiles) {
                try {
                    const filePath = join(logDir, file);
                    const contents = fs.readFileSync(filePath, 'utf8');
                    const lines = contents.split(/\r?\n/);
                    allLines = allLines.concat(lines);
                } catch (error) {
                    // Skip files that can't be read
                }
            }

            return allLines;
        } catch (error) {
            // Return empty array if there's any error
            return [];
        }
    }
}

export const loggerFactory = new LoggerFactory();
