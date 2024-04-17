import util from 'node:util';
import pidusage from 'pidusage';
// import eventLoopStats from 'event-loop-stats';
import os from 'os';
import v8 from 'v8';
import {loggerFactory} from '../logs/LoggerFactory';
import {statfs} from 'node:fs';
import {cpuUsage, freememPercentage} from './OSUtils';

const sfsAsync = util.promisify(statfs);

export interface OSMetricsStat {
    timestamp: number, // now
    name: string, // host name

    cpuPercent: number,
    memoryPercent: number,
    memory2Percent: number,
    diskPercent: number,

    cpu: number, // from 0 to 100*vcore
    cpus: any[],
    memory: number, // bytes
    load: number[], // ?
    heap: any,
    loop: any,
    fs: any,
}

export class OSMetrics {

    static async getMetrics(): Promise<OSMetricsStat> {
        const logger = loggerFactory.getLogger();
        let stat: OSMetricsStat;

        try {
            stat = await pidusage(process.pid);
            stat.name = os.hostname() + '_' + os.machine();
            const cpus = os.cpus();
            //     model - A string representing the model of the CPU core.
            //     speed - The speed of the CPU core in MHz.
            //     times - an object containing the following properties:
            //         ueser - the number of milliseconds the CPU has spent in user mode.
            //         nice - the number of milliseconds the CPU has spent in nice mode.
            //         sys - the number of milliseconds the CPU has sent in sys mode.
            //         idle - the number of milliseconds the CPU has spent in idle mode.
            //         irq - the number of milliseconds the CPU has spent in irq mode.
            // logger.warn('cpus', cpus);
            stat.cpus = cpus;
            // let cpuTotal = 0.000001, cpuUserSys = 0;
            // for (const cpu of cpus) {
            //     for (const type in cpu.times) {
            //         cpuTotal += cpu.times[type];
            //         if (type === 'user' || type === 'sys') {
            //             cpuUserSys += cpu.times[type];
            //         }
            //     }
            // }
            //  stat.cpuPercent = Math.round(stat.cpu / stat.cpus.length * 100) / 100;
            // stat.cpuPercent = Math.round(1000 * cpuUserSys / cpuTotal / 10);
            stat.cpuPercent = Math.round(100 * 100 * await cpuUsage()) / 100;

            stat.memory = stat.memory / 1024 / 1024; // Convert from B to MB

            stat.load = os.loadavg();
            stat.timestamp = Date.now();
            stat.heap = v8.getHeapStatistics();
            // total_heap_size: Number of bytes V8 has allocated for the heap. This can grow if usedHeap needs more.
            //    used_heap_size: Number of bytes in used by application data
            // total_heap_size_executable: Number of bytes for compiled bytecode and JITed code
            // heap_size_limit: The absolute limit the heap cannot exceed (default limit or --max_old_space_size)
            // total_physical_size: Committed size

            stat.memoryPercent = Math.round(stat.memory / (stat.heap.total_available_size / 1024 / 1024) * 100 * 100) / 100;
            const mp = freememPercentage()
            stat.memory2Percent = (1 - mp) * 100;

            // stat.loop = eventLoopStats.sense();
            //
            // max: Maximum number of milliseconds spent in a single loop since last sense call.
            //     min: Minimum number of milliseconds spent in a single loop since last sense call.
            //     sum: Total number of milliseconds spent in the loop since last sense call.
            //     num: Total number of loops since last sense call.

            const fsStat = await sfsAsync('/');
            stat.fs = {
                available: fsStat.bavail * fsStat.bsize,
                // free: fsStat.bfree * fsStat.bsize,
                total: fsStat.blocks * fsStat.bsize,
                used: (fsStat.blocks - fsStat.bfree) * fsStat.bsize,
            };

            stat.diskPercent = Math.round(stat.fs.used / stat.fs.total * 100 * 100) / 100;
        } catch (e) {
            logger.error(e);
        }
        return stat;
    }

}
