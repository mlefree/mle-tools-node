import os from 'os';
import {promisify} from 'util';
import {exec} from 'node:child_process';
import fs from 'fs';

const execute = promisify(exec);
const sleep = promisify(setTimeout);

export const freememPercentage = function () {
    return os.freemem() / os.totalmem();
};

export const cpuTemperature = async function () {
    let result = {
        main: null,
        cores: [],
        max: null,
        socket: [],
        chipset: null,
    };

    if (process.platform === 'linux') {
        // CPU Chipset, Socket
        try {
            const cmd =
                'cat /sys/class/thermal/thermal_zone*/type  2>/dev/null; echo "-----"; cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null;';
            const executeCat = await execute(cmd);
            const parts = executeCat.stdout.split('-----\n');
            if (parts.length === 2) {
                const lines = parts[0].split('\n');
                const lines2 = parts[1].split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('acpi') && lines2[i]) {
                        result.socket.push(Math.round(parseInt(lines2[i], 10) / 100) / 10);
                    }
                    if (line.startsWith('pch') && lines2[i]) {
                        result.chipset = Math.round(parseInt(lines2[i], 10) / 100) / 10;
                    }
                }
            }
        } catch (e) {
            console.warn(e);
        }

        try {
            const cmd =
                'for mon in /sys/class/hwmon/hwmon*; do for label in "$mon"/temp*_label; do if [ -f $label ]; then value=${label%_*}_input; echo $(cat "$label")___$(cat "$value"); fi; done; done;';
            const executeMon = await execute(cmd);
            let stdout = executeMon.stdout;
            const tdiePos = stdout.toLowerCase().indexOf('tdie');
            if (tdiePos !== -1) {
                stdout = stdout.substring(tdiePos);
            }
            let lines = stdout.split('\n');
            let tctl = 0;
            lines.forEach((line) => {
                const parts = line.split('___');
                const label = parts[0];
                const value = parts.length > 1 && parts[1] ? parts[1] : '0';
                if (value && label && label.toLowerCase() === 'tctl') {
                    tctl = result.main = Math.round(parseInt(value, 10) / 100) / 10;
                }
                if (
                    value &&
                    (label === undefined || (label && label.toLowerCase().startsWith('core')))
                ) {
                    result.cores.push(Math.round(parseInt(value, 10) / 100) / 10);
                } else if (
                    value &&
                    label &&
                    result.main === null &&
                    (label.toLowerCase().indexOf('package') >= 0 ||
                        label.toLowerCase().indexOf('physical') >= 0 ||
                        label.toLowerCase() === 'tccd1')
                ) {
                    result.main = Math.round(parseInt(value, 10) / 100) / 10;
                }
            });
            if (tctl && result.main === null) {
                result.main = tctl;
            }

            if (result.cores.length > 0) {
                if (result.main === null) {
                    result.main = Math.round(
                        result.cores.reduce((a, b) => a + b, 0) / result.cores.length
                    );
                }
                const maxtmp = Math.max(...result.cores);
                result.max = maxtmp > result.main ? maxtmp : result.main;
            }
            if (result.main !== null) {
                if (result.max === null) {
                    result.max = result.main;
                }
                return result;
            }

            const executeSensors = await execute('sensors');
            lines = executeSensors.stdout.split('\n');
            let tdieTemp = null;
            let newSectionStarts = true;
            let section = '';
            lines.forEach(function (line) {
                // determine section
                if (line.trim() === '') {
                    newSectionStarts = true;
                } else if (newSectionStarts) {
                    if (line.trim().toLowerCase().startsWith('acpi')) {
                        section = 'acpi';
                    }
                    if (line.trim().toLowerCase().startsWith('pch')) {
                        section = 'pch';
                    }
                    if (line.trim().toLowerCase().startsWith('core')) {
                        section = 'core';
                    }
                    newSectionStarts = false;
                }
                const regex = /[+-]([^°]*)/g;
                const temps = line.match(regex);
                const firstPart = line.split(':')[0].toUpperCase();
                if (section === 'acpi') {
                    // socket temp
                    if (firstPart.indexOf('TEMP') !== -1) {
                        result.socket.push(parseFloat(temps.toString()));
                    }
                } else if (section === 'pch') {
                    // chipset temp
                    if (firstPart.indexOf('TEMP') !== -1 && !result.chipset) {
                        result.chipset = parseFloat(temps.toString());
                    }
                }
                // cpu temp
                if (firstPart.indexOf('PHYSICAL') !== -1 || firstPart.indexOf('PACKAGE') !== -1) {
                    result.main = parseFloat(temps.toString());
                }
                if (firstPart.indexOf('CORE ') !== -1) {
                    result.cores.push(parseFloat(temps.toString()));
                }
                if (firstPart.indexOf('TDIE') !== -1 && tdieTemp === null) {
                    tdieTemp = parseFloat(temps.toString());
                }
            });

            if (result.cores.length > 0) {
                result.main = Math.round(
                    result.cores.reduce((a, b) => a + b, 0) / result.cores.length
                );
                const maxtmp = Math.max(...result.cores);
                result.max = maxtmp > result.main ? maxtmp : result.main;
            } else {
                if (result.main === null && tdieTemp !== null) {
                    result.main = tdieTemp;
                    result.max = tdieTemp;
                }
            }
            if (result.main !== null || result.max !== null) {
                return result;
            }

            let err = null;
            try {
                fs.accessSync('/sys/class/thermal/thermal_zone0/temp');
            } catch (e) {
                err = e;
            }

            if (err === null) {
                const stdout = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp');
                lines = stdout.toString().split('\n');
                if (lines.length > 0) {
                    result.main = parseFloat(lines[0]) / 1000.0;
                    result.max = result.main;
                }
                return result;
            } else {
                const executeVcgen = await execute('/opt/vc/bin/vcgencmd measure_temp');
                lines = executeVcgen.stdout.split('\n');
                if (lines.length > 0 && lines[0].indexOf('=')) {
                    result.main = parseFloat(lines[0].split('=')[1]);
                    result.max = result.main;
                }
                return result;
            }
        } catch (e) {
            console.warn(e);
            return result;
        }
    }

    if (
        process.platform === 'freebsd' ||
        process.platform === 'openbsd' ||
        process.platform === 'netbsd'
    ) {
        const executeDev = await execute('sysctl dev.cpu | grep temp');
        const lines = executeDev.stdout.split('\n');
        let sum = 0;
        lines.forEach(function (line) {
            const parts = line.split(':');
            if (parts.length > 1) {
                const temp = parseFloat(parts[1].replace(',', '.'));
                if (temp > result.max) {
                    result.max = temp;
                }
                sum = sum + temp;
                result.cores.push(temp);
            }
        });
        if (result.cores.length) {
            result.main = Math.round((sum / result.cores.length) * 100) / 100;
        }

        return result;
    }

    if (process.platform === 'darwin') {
        let osxTemp = null;
        try {
            osxTemp = require('osx-temperature-sensor');
        } catch (er) {
            osxTemp = null;
        }
        if (osxTemp) {
            result = osxTemp.cpuTemperature();
            // round to 2 digits
            if (result.main) {
                result.main = Math.round(result.main * 100) / 100;
            }
            if (result.max) {
                result.max = Math.round(result.max * 100) / 100;
            }
            if (result.cores && result.cores.length) {
                for (let i = 0; i < result.cores.length; i++) {
                    result.cores[i] = Math.round(result.cores[i] * 100) / 100;
                }
            }
        }

        return result;
    }
};

export const cpuUsage = async () => {
    return getCPUUsage(false);
};

async function getCPUUsage(free: boolean) {
    const stats1 = getCPUInfo();
    const startIdle = stats1.idle;
    const startTotal = stats1.total;

    await sleep(100);
    const stats2 = getCPUInfo();
    const endIdle = stats2.idle;
    const endTotal = stats2.total;

    const idle = endIdle - startIdle;
    const total = endTotal - startTotal;
    const perc = idle / total;

    if (free === true) {
        return perc;
    } else {
        return 1 - perc;
    }
}

function getCPUInfo() {
    const cpus = os.cpus();

    let user = 0;
    let nice = 0;
    let sys = 0;
    let idle = 0;
    let irq = 0;

    for (const cpu in cpus) {
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    }

    const total = user + nice + sys + idle + irq;

    return {
        idle: idle,
        total: total,
    };
}
