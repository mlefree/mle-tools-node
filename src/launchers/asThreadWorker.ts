import {Worker} from 'worker_threads';
import {IWorkerParams} from './IWorkerParams';

let WORKERS_COUNT = 0;

module.exports = (params: IWorkerParams, onEnd?: () => Promise<void>, onError?: (code: number) => Promise<void>) => {
    // console.log('### WorkerLaunched:', ++WORKERS_COUNT);
    const path = require('node:path');
    const workerThread = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
    workerThread.on('message', console.log);
    workerThread.on('exit', async (exitCode) => {
        --WORKERS_COUNT;
        // console.log('### WorkerLaunched done:', exitCode, WORKERS_COUNT);
        if (exitCode && onError) {
            await onError(exitCode);
        } else if (onEnd) {
            await onEnd();
        }
    });
    workerThread.on('error', async (err: any) => {
        console.error('### WorkerLaunched error:', err);
        await onError(err);
    });
};
