import {AbstractWorkerProcessor} from './AbstractWorkerProcessor';
import {IWorkerParams} from './IWorkerParams';

module.exports = async (params: IWorkerParams, onEnd?: () => Promise<void>, onError?: (code: number) => Promise<void>) => {
    const wn = params.workerProcesses.join('-');
    const wi = params.workerInstance;
    const wd = params.workerData;
    const {WorkerProcessor} = require(params.workerProcessorPathFile);
    const processor: AbstractWorkerProcessor = new WorkerProcessor(wn + '-d-' + wi, wd, true);

    try {
        const retry = await processor.launch();
        if (retry && onError) {
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
