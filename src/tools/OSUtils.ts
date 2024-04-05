import os from 'os';
import {promisify} from 'util';

const sleep = promisify(setTimeout);

export const platform = () => {
    return process.platform;
}

export const cpuCount = function () {
    return os.cpus().length;
}

export const sysUptime = function () {
    //seconds
    return os.uptime();
}

export const processUptime = function () {
    //seconds
    return process.uptime();
}


// Memory
export const freemem = function () {
    return os.freemem() / (1024 * 1024);
}

export const totalmem = function () {

    return os.totalmem() / (1024 * 1024);
}

export const freememPercentage = function () {
    return os.freemem() / os.totalmem();
}


/*
* Returns All the load average usage for 1, 5 or 15 minutes.
*/
export const allLoadavg = function () {

    var loads = os.loadavg();

    return loads[0].toFixed(4) + ',' + loads[1].toFixed(4) + ',' + loads[2].toFixed(4);
}

/*
* Returns the load average usage for 1, 5 or 15 minutes.
*/
export const loadavg = function (_time) {

    if (_time === undefined || (_time !== 5 && _time !== 15)) _time = 1;

    var loads = os.loadavg();
    var v = 0;
    if (_time == 1) v = loads[0];
    if (_time == 5) v = loads[1];
    if (_time == 15) v = loads[2];

    return v;
}


export const cpuFree = async function () {
    return getCPUUsage(true);
}

export const cpuUsage = async () => {
    return getCPUUsage(false);
}

async function getCPUUsage(free: boolean) {

    var stats1 = getCPUInfo();
    var startIdle = stats1.idle;
    var startTotal = stats1.total;

    await sleep(100);
    var stats2 = getCPUInfo();
    var endIdle = stats2.idle;
    var endTotal = stats2.total;

    var idle = endIdle - startIdle;
    var total = endTotal - startTotal;
    var perc = idle / total;

    if (free === true)
        return perc;
    else
        return (1 - perc);

}

function getCPUInfo() {
    var cpus = os.cpus();

    var user = 0;
    var nice = 0;
    var sys = 0;
    var idle = 0;
    var irq = 0;
    var total = 0;

    for (var cpu in cpus) {

        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    }

    var total = user + nice + sys + idle + irq;

    return {
        'idle': idle,
        'total': total
    };
}

