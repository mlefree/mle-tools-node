import {Worker} from 'worker_threads';
import {IWorkerParams} from './Launcher';

let WORKERS_COUNT = 0;

module.exports = function (params: IWorkerParams, callback: Function) {
    console.log('### WorkerLaunched:', ++WORKERS_COUNT);
    const path = require('node:path');
    const workerThread = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
    workerThread.on('exit', () => {
        console.log('### WorkerLaunched done:', --WORKERS_COUNT);
        callback(null);
    });
    workerThread.on('error', (err) => {
        console.error('### WorkerLaunched error:', err);
        callback(null);
    });
};
