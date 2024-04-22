export interface QueueConcurrency {
    default: number,
    keys: {
        contains: string,
        concurrency: number,
    }[]
}


