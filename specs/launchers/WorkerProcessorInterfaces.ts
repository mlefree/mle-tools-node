import {LoggerLevels} from '../../src';

export interface Config {
    label: string;
    time: number;
    logLevel: LoggerLevels;
}

export interface Input {
    count: number;
}

export interface Inputs {
    timeToSleep: number;
    messageToWrite: string;
}
