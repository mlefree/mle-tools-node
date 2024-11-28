import onHeaders from 'on-headers';

class Timer {
    protected _times: Map<string, {
        name: string,
        description: string,
        start: [number, number],
        value: number
    }>;

    constructor() {
        this._times = new Map()
    }

    time(name: string, description: string) {
        this._times.set(name, {
            name,
            description,
            start: process.hrtime(),
            value: 0
        })
    }

    timeEnd(name: string) {
        const timeObj = this._times.get(name)
        if (!timeObj) {
            return console.warn(`No such name ${name}`)
        }
        const duration = process.hrtime(timeObj.start)
        timeObj.value = (duration[0] * 1E3) + (duration[1] * 1e-6);
        this._times.delete(name)
        return timeObj
    }

    clear() {
        this._times.clear()
    }

    keys() {
        return this._times.keys()
    }
}

function setMetric(headers, opts) {
    return (name: string, value: number, description: string) => {
        if (typeof name !== 'string') {
            return console.warn('1st argument name is not string')
        }
        if (typeof value !== 'number') {
            return console.warn('2nd argument value is not number')
        }

        const dur = Number.isFinite(opts.precision)
            ? value.toFixed(opts.precision) : value

        const metric = typeof description !== 'string' || !description
            ? `${name}; dur=${dur}` : `${name}; dur=${dur}; desc="${description}"`

        headers.push(metric)
    }
}

function startTime(timer: Timer) {
    return (name: string, description: string) => {
        if (typeof name !== 'string') {
            return console.warn('1st argument name is not string')
        }

        timer.time(name, description)
    }
}

function endTime(timer: Timer, res) {
    return (name: string) => {
        if (typeof name !== 'string') {
            return console.warn('1st argument name is not string')
        }

        const obj = timer.timeEnd(name)
        if (!obj) {
            return
        }
        res.setMetric(obj.name, obj.value, obj.description)
    }
}

export class TimingMiddleware {

    constructor() {
    }

    public middleWare() {
        const opts = {
            name: 'total',
            description: 'Total Response Time',
            total: true,
            enabled: true,
            autoEnd: true,
            precision: +Infinity
        };

        return (req: any, res: any, next: () => void) => {
            const headers = []
            const timer = new Timer();
            const startAt = process.hrtime();

            if (!res.setMetric || !res.startTime || !res.endTime) {
                res.setMetric = setMetric(headers, opts);
                res.startTime = startTime(timer);
                res.endTime = endTime(timer, res);
            }

            onHeaders(res, () => {
                if (opts.autoEnd) {
                    const keys = timer.keys()
                    for (const key of keys) {
                        res.endTime(key)
                    }
                }

                if (opts.total) {
                    const diff = process.hrtime(startAt)
                    const timeSec = (diff[0] * 1E3) + (diff[1] * 1e-6)
                    res.setMetric(opts.name, timeSec, opts.description)
                }
                timer.clear();

                if (opts.enabled) {
                    const existingHeaders = res.getHeader('Server-Timing');
                    res.setHeader('Server-Timing', [].concat(existingHeaders || []).concat(headers));
                }
            });

            next();
        };
    }
}


/**
 * Usage :
 *   app.use(timing()); // use: res.startTime('file', 'File IO metric'); ...  res.endTime('file');
 *
 */
export const timing = () => {
    const timingMiddleware = new TimingMiddleware();
    return timingMiddleware.middleWare();
};
