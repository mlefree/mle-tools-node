const {isMainThread, workerData, threadId} = require('worker_threads');

(async () => {
    if (isMainThread) {
        return;
    }

    const params = workerData;
    const wn = params.workerProcesses.join('-');
    const wi = params.workerInstance;
    const wd = params.workerData;
    const wpp = params.workerProcessorPathFile;
    let WorkerProcessorClass;

    try {
        const tsNode = require('ts-node');
        tsNode.register();
    } catch (err) {
        console.warn('asThread ts-node issue:', err);
    }

    try {
        const {WorkerProcessor} = require(wpp);
        WorkerProcessorClass = WorkerProcessor;
    } catch (err) {
        console.error('[mnt] asThread require issue:', err);
        process.exit(2);
    }

    try {
        const processor = new WorkerProcessorClass(
            wn + '-#THREAD(' + process.pid + '/' + threadId + ')-' + wi,
            wd,
            false
        );
        const needRetry = await processor.launch();
        if (needRetry) {
            process.exit(1);
        }
    } catch (err) {
        console.error('[mnt] asThread processor issue:', err);
        process.exit(2);
    }
    process.exit(0);
})();
