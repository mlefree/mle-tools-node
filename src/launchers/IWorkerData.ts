export interface IWorkerData {
    key?: string; // to identify duplicate
    id?: string;
    idsToWait?: string[];
    namesToLaunch?: string[];

    // depends on config and input app types:
    config?: any;
    input?: any;
}
