import {Worker} from 'worker_threads';
import {IWorkerParams} from './IWorkerParams';

let WORKERS_COUNT = 0;

module.exports = (
    params: IWorkerParams,
    onEnd?: () => Promise<void>,
    onRetry?: (reason?: string) => Promise<void>,
    onError?: (error: any) => Promise<void>
) => {
    // console.log('### WorkerLaunched:', ++WORKERS_COUNT);
    const path = require('node:path');
    const workerThread = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
    workerThread.on('message', console.log);
    workerThread.on('exit', async (exitCode) => {
        --WORKERS_COUNT;
        // console.log('### WorkerLaunched done:', exitCode, WORKERS_COUNT);
        if (exitCode === 1 && onRetry) {
            await onRetry('Thread exited with retry code');
        } else if (exitCode && exitCode !== 1 && onError) {
            await onError(new Error(`Thread exited with error code ${exitCode}`));
        } else if (onEnd) {
            await onEnd();
        }
    });
    workerThread.on('error', async (err: any) => {
        console.error('(mtn) WorkerLaunched error:', err);
        if (onError) {
            await onError(err);
        }
    });
};
