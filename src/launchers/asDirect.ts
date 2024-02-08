import {AbstractWorkerProcessor} from './AbstractWorkerProcessor';
import {IWorkerParams} from './Launcher';

module.exports = async function (inputs: IWorkerParams) {

    const worker = async (params: IWorkerParams) => {
        const wn = params.workerDescription;
        const wi = params.workerInstance;
        const wd = params.workerData;
        const {WorkerProcessor} = require(params.workerProcessorPathFile);
        const processor: AbstractWorkerProcessor = new WorkerProcessor(wn + '-d-' + wi, wd, true);
        return await processor.launch();
    };

    return await worker(inputs);
};
