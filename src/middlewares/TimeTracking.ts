import {loggerFactory, LoggerLevels} from '../logs';

export class TimeTracking {

    constructor(private options: {
        milliSecBeforeWarning: number
    } = {
        milliSecBeforeWarning: 1000
    }) {
    }

    private static getDurationInMilliseconds(start: [number, number]) {
        const NS_PER_SEC = 1e9;
        const NS_TO_MS = 1e6;
        const diff = process.hrtime(start);
        return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
    }

    private static async warnIfExceeded(req: any, timeInMs: number, limitInMs: number) {
        if (timeInMs > limitInMs) {
            loggerFactory.getLogger().warn(`${req.method} ${req.originalUrl} looks too long : ${timeInMs} ms`);
        }
    }

    public use() {
        return (req: any, res: any, next: Function) => {
            const logger = loggerFactory.getLogger();
            if (logger.getLevel() === LoggerLevels.DEBUG) {
                logger.debug(`${req.method} ${req.originalUrl} [STARTED]`);
            }

            const start = process.hrtime();

            res.on('finish', async () => {
                const durationInMilliseconds = TimeTracking.getDurationInMilliseconds(start);

                if (logger.getLevel() === LoggerLevels.DEBUG) {
                    logger.debug(`${req.method} ${req.originalUrl} [FINISHED] ${durationInMilliseconds.toLocaleString()} ms`);
                }
                await TimeTracking.warnIfExceeded(req, durationInMilliseconds, this.options.milliSecBeforeWarning);
            });

            res.on('close', async () => {
                const durationInMilliseconds = TimeTracking.getDurationInMilliseconds(start);

                if (logger.getLevel() === LoggerLevels.DEBUG) {
                    logger.debug(`${req.method} ${req.originalUrl} [CLOSED] ${durationInMilliseconds.toLocaleString()} ms`);
                }
                await TimeTracking.warnIfExceeded(req, durationInMilliseconds, this.options.milliSecBeforeWarning);
            });

            next();
        };
    }

}
