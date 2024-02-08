const {isMainThread, workerData} = require('worker_threads');

(async () => {

    if (isMainThread) {
        return;
    }

    const params = workerData;
    const wn = params.workerDescription;
    const wi = params.workerInstance;
    const wd = params.workerData;
    const wpp = params.workerProcessorPathFile;
    if (wpp.indexOf('.ts')) {
        require('ts-node').register();
    }
    const {WorkerProcessor} = require(wpp);
    try {
        const processor = new WorkerProcessor(wn + '-t-' + wi, wd, false);
        const result = await processor.launch();
    } catch (err) {
        console.error('### Thread fail:', err)
    }
    process.exit(0);
})();
