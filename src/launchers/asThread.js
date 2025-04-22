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
        // if (wpp.indexOf('.ts') > 0) {
        // require('ts-node').register();
        // show-ts-node-config.js
        const tsNode = require('ts-node');
        // Register ts-node with the current process
        tsNode.register();

        // Create a service to get the ts-node configuration
        // const service = tsNode.create();
        // console.log(service.config);
        // }
        const {WorkerProcessor} = require(wpp);
        WorkerProcessorClass = WorkerProcessor;
    } catch (err) {
        console.error(err);
    }

    try {
        const processor = new WorkerProcessorClass(wn + '-#THREAD(' + process.pid + '/' + threadId + ')-' + wi, wd, false);
        const needRetry = await processor.launch();
        if (needRetry) {
            process.exit(1);
        }
    } catch (err) {
        process.exit(2);
    }
    process.exit(0);
})();
