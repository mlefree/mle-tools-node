import {MError} from './MError';

export class MErrorCode extends MError {

    constructor(
        message: string,
        public code: number) {
        super(message);
        this.code = code;
    }

}

