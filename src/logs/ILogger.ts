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
