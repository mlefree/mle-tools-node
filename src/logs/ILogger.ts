export interface ILogger {

    debug(...extra: any[]): any;

    info(...extra: any[]): any;

    warn(...extra: any[]): any;

    error(...extra: any[]): any;

}

