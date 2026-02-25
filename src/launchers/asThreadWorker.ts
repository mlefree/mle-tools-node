import {Worker} from 'worker_threads';
import {IWorkerParams} from './IWorkerParams';
import {THREAD_EXIT_CODES} from './AbstractWorkerProcessor';

let WORKERS_COUNT = 0;

module.exports = (
    params: IWorkerParams,
    onEnd?: () => Promise<void>,
    onRetry?: (reason?: string) => Promise<void>,
    onError?: (error: any) => Promise<void>,
    onBlocking?: (error: any) => Promise<void>
) => {
    // console.log('### WorkerLaunched:', ++WORKERS_COUNT);
    const path = require('node:path');
    const workerThread = new Worker(path.join(__dirname, './asThread.js'), {workerData: params});
    workerThread.on('message', console.log);
    workerThread.on('exit', async (exitCode) => {
        --WORKERS_COUNT;
        // console.log('### WorkerLaunched done:', exitCode, WORKERS_COUNT);
        if (exitCode === THREAD_EXIT_CODES.BLOCKING && onBlocking) {
            await onBlocking(new Error('Thread detected blocking error (exit code 3)'));
        } else if (exitCode === THREAD_EXIT_CODES.RETRY && onRetry) {
            await onRetry('Thread exited with retry code');
        } else if (exitCode && exitCode !== THREAD_EXIT_CODES.RETRY && onError) {
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
