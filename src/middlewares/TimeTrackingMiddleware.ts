import {loggerFactory, LoggerLevels} from '../logs';

export interface ITimeTrackingOptions {
    milliSecBeforeWarning: number;
}

export class TimeTrackingMiddleware {
    constructor(
        private options: ITimeTrackingOptions = {
            milliSecBeforeWarning: 1000,
        }
    ) {}

    private static getDurationInMilliseconds(start: [number, number]) {
        const NS_PER_SEC = 1e9;
        const NS_TO_MS = 1e6;
        const diff = process.hrtime(start);
        return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
    }

    private static async warnIfExceeded(req: any, timeInMs: number, limitInMs: number) {
        if (timeInMs > limitInMs) {
            loggerFactory
                .getLogger()
                .warn(`${req.method} ${req.originalUrl} looks too long : ${timeInMs} ms`);
        }
    }

    public middleWare() {
        return (req: any, res: any, next: () => void) => {
            const logger = loggerFactory.getLogger();
            if (logger.getLevel() === LoggerLevels.DEBUG) {
                logger.debug(`[mtn] ${req.method} ${req.originalUrl} [STARTED]`);
            }

            const start = process.hrtime();

            res.on('finish', async () => {
                const durationInMilliseconds =
                    TimeTrackingMiddleware.getDurationInMilliseconds(start);

                if (logger.getLevel() === LoggerLevels.DEBUG) {
                    logger.debug(
                        `[mtn] ${req.method} ${req.originalUrl} [FINISHED] ${durationInMilliseconds.toLocaleString()} ms`
                    );
                }
                await TimeTrackingMiddleware.warnIfExceeded(
                    req,
                    durationInMilliseconds,
                    this.options.milliSecBeforeWarning
                );
            });

            res.on('close', async () => {
                const durationInMilliseconds =
                    TimeTrackingMiddleware.getDurationInMilliseconds(start);

                if (logger.getLevel() === LoggerLevels.DEBUG) {
                    logger.debug(
                        `[mtn] ${req.method} ${req.originalUrl} [CLOSED] ${durationInMilliseconds.toLocaleString()} ms`
                    );
                }
                await TimeTrackingMiddleware.warnIfExceeded(
                    req,
                    durationInMilliseconds,
                    this.options.milliSecBeforeWarning
                );
            });

            next();
        };
    }
}

export const timeTracking = (options?: ITimeTrackingOptions) => {
    const timeTrackingMiddleware = new TimeTrackingMiddleware(options);
    return timeTrackingMiddleware.middleWare();
};
