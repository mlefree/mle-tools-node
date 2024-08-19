const {isMainThread, workerData} = require('worker_threads');

(async () => {

    if (isMainThread) {
        return;
    }

    const params = workerData;
    const wn = params.workerProcesses.join('-');
    const wi = params.workerInstance;
    const wd = params.workerData;
    const wpp = params.workerProcessorPathFile;
    if (wpp.indexOf('.ts')) {
        require('ts-node').register();
    }
    const {WorkerProcessor} = require(wpp);
    try {
        const processor = new WorkerProcessor(wn + '-#THREAD-' + wi, wd, false);
        const needRetry = await processor.launch();
        console.error('### Thread needRetry:', needRetry);
        if (needRetry) {
            process.exit(1);
        }
    } catch (err) {
        console.error('### Thread fail:', err);
        process.exit(2);
    }
    process.exit(0);
})();
