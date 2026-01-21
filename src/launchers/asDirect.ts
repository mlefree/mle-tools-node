import {AbstractWorkerProcessor} from './AbstractWorkerProcessor';
import {IWorkerParams} from './IWorkerParams';

module.exports = async (
    params: IWorkerParams,
    onEnd?: () => Promise<void>,
    onRetry?: (reason?: string) => Promise<void>,
    onError?: (error: any) => Promise<void>
) => {
    const wn = params.workerProcesses.join('-');
    const wi = params.workerInstance;
    const wd = params.workerData;
    const {WorkerProcessor} = require(params.workerProcessorPathFile);
    const processor: AbstractWorkerProcessor = new WorkerProcessor(
        wn + '-#D(' + process.pid + ')-' + wi,
        wd,
        true
    );

    const launchedId = 'Direct-' + new Date().toISOString();
    try {
        const needRetry = await processor.launch();
        if (needRetry && onRetry) {
            await onRetry('Worker returned needRetry=true');
        } else if (onEnd) {
            await onEnd();
        }
    } catch (e) {
        if (onError) {
            await onError(e);
        }
    }
    return launchedId;
};
