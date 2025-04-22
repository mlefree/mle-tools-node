import {AbstractWorkerProcessor} from './AbstractWorkerProcessor';
import {IWorkerParams} from './IWorkerParams';

module.exports = async (params: IWorkerParams, onEnd?: () => Promise<void>, onError?: (code: number) => Promise<void>) => {
    const wn = params.workerProcesses.join('-');
    const wi = params.workerInstance;
    const wd = params.workerData;
    const {WorkerProcessor} = require(params.workerProcessorPathFile);
    const processor: AbstractWorkerProcessor = new WorkerProcessor(wn + '-#DIRECT(' + process.pid + ')-' + wi, wd, true);

    try {
        const needRetry = await processor.launch();
        if (needRetry && onError) {
            await onError(1);
        } else if (onEnd) {
            await onEnd();
        }
    } catch (e) {
        if (onError) {
            await onError(e);
        }
    }
};
