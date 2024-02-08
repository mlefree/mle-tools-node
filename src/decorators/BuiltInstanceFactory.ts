import {BuiltInstance} from './BuiltInstance';

export class BuiltInstanceFactory {

    private algorithmVersion: string;
    private buildModel: any;
    private minutesBeforeGettingOld: number;

    constructor() {
        this.algorithmVersion = '';
    }

    setUp(algorithmVersion: string,
          buildModel: any,
          minutesBeforeGettingOld = 60) {
        this.algorithmVersion = algorithmVersion;
        this.buildModel = buildModel;
        this.minutesBeforeGettingOld = minutesBeforeGettingOld;
    }

    getInstance(instance: any, buildModel?: any) {
        let buildModelToUse = buildModel;
        if (!buildModelToUse) {
            buildModelToUse = this.buildModel;
        }
        return new BuiltInstance(instance, buildModelToUse, this.algorithmVersion, this.minutesBeforeGettingOld);
    }
}

export const builtInstanceFactory = new BuiltInstanceFactory();
