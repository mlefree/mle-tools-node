import {Worker} from 'worker_threads';
import {IWorkerParams} from './IWorkerParams';

let WORKERS_COUNT = 0;

module.exports = function (params: IWorkerParams, onEnd: () => void, onError: (code: number) => void) {
    console.log('### WorkerLaunched:', ++WORKERS_COUNT);
    const path = require('node:path');
    const workerThread = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
    workerThread.on('exit', (exitCode) => {
        console.log('### WorkerLaunched done:', exitCode, --WORKERS_COUNT);
        if (exitCode) {
            onError(exitCode);
        } else {
            onEnd();
        }
    });
    workerThread.on('error', (err: any) => {
        console.error('### WorkerLaunched error:', err);
        onError(err);
    });
};
