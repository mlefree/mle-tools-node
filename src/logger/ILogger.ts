import {LoggerLevels} from './LoggerLevels';

export interface IConsole {
    debug(...extra: any[]): any;

    info(...extra: any[]): any;

    warn(...extra: any[]): any;

    error(...extra: any[]): any;
}

export interface ILogger extends IConsole {
    debug(...extra: any[]): any;

    info(...extra: any[]): any;

    warn(...extra: any[]): any;

    error(...extra: any[]): any;

    getLevel(): LoggerLevels;
}

export interface ILoggerOptions {
    active?: boolean;
    label?: string;
    consoleLevel?: LoggerLevels;
    logLevel?: LoggerLevels;
    notifyUser?: string;
    notifyPwd?: string;
    notifyTo?: string;
    filters?: object;
    path?: string;
}
