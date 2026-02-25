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
        if (!process[Symbol.for('ts-node.register.instance')]) {
            // Clean up any existing process listeners before registering ts-node
            process.removeAllListeners('uncaughtException');
            process.removeAllListeners('unhandledRejection');
            tsNode.register();
        }
    } catch (err) {
        console.warn('(mtn) asThread ts-node issue:', err);
    }

    try {
        const {WorkerProcessor} = require(wpp);
        WorkerProcessorClass = WorkerProcessor;
    } catch (err) {
        console.error('(mtn) asThread require issue:', err);
        process.exit(2);
    }

    try {
        const processor = new WorkerProcessorClass(
            wn + '-#T(' + process.pid + '/' + threadId + ')-' + wi,
            wd,
            false
        );
        const needRetry = await processor.launch();

        // Check for blocking error before normal exit
        if (WorkerProcessorClass.IsBlockingDetected && WorkerProcessorClass.IsBlockingDetected()) {
            console.error('(mtn) asThread blocking error detected');
            process.exit(3); // BLOCKING — signals unhealthy state to main process
        }

        if (needRetry) {
            process.exit(1);
        }
    } catch (err) {
        console.error('(mtn) asThread processor issue:', err);
        process.exit(2);
    } finally {
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
    }

    process.exit(0);
})();
