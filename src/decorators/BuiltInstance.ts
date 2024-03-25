import {Configuration} from '../configuration/Configuration';
import {loggerFactory} from '../logs/LoggerFactory';
import {MError} from '../errors/MError';

export interface IBuildModel {
    findById(buildId: any): any;

    deleteMany(param: { buildType: string; statusWorkers: any[]; updatedAt: { $lte: Date } }): any;

    deleteOne(param: { _id: any }): any;
}

export interface IBuildContainer {
    builds: string[];
    save: Function;
    getBuilds?: Function;
}

export interface IBuild {
    id: string;
    buildType: string,
    algorithmVersion: string;
    configurationAsJSON: string;
    updatedAt: Date;
    statusGlobal: number;
    getErrorStack?: Function;
}

export class BuiltInstance {

    constructor(
        private instance: IBuildContainer,
        private buildModel: IBuildModel,
        private algorithmVersion: string,
        private minutesBeforeGettingOld: number) {
        if (!instance ||
            (typeof instance.builds === 'undefined' && typeof instance.getBuilds === 'undefined') ||
            typeof instance.save === 'undefined'
        ) {
            throw new MError('BuiltInstance named needs a compliant instance.');
        }
    }

    async needsToBeRebuilt(configuration: Configuration, buildType: string) {
        return !await this.getCompliantBuild(configuration, buildType);
    }

    async getCompliantBuild(configuration: Configuration, buildType: string) {
        let lastCompliantBuild = null;
        const buildModel = this.buildModel;

        const allBuilds = this.instance.builds || this.instance.getBuilds();

        let index = 0;
        for (const buildId of allBuilds) {
            const build: IBuild = await buildModel.findById(buildId).exec();
            if (!build) {
                this.instance.builds.splice(index, 1);
                await this.instance.save();
            } else {
                if (this.compareBuild(build, buildType, configuration)) {
                    lastCompliantBuild = build;
                }
                index++;
            }
        }

        return lastCompliantBuild;
    }

    /**
     *
     * @param configuration {Configuration}
     * @param buildType {string}
     * @param timestampBeginIncluded {number}
     * @param timestampEndNotIncluded {number}
     * @returns {Promise<Document>}
     */
    async createBuild(configuration: Configuration,
                      buildType: string,
                      timestampBeginIncluded?: number,
                      timestampEndNotIncluded?: number) {

        const buildModel = this.buildModel;
        const doc: any = {
            buildType: buildType,
            configurationAsJSON: configuration.getJSON(buildType),
            algorithmVersion: this.algorithmVersion,
        };
        if (timestampBeginIncluded > 0 && timestampEndNotIncluded > 0) {
            doc.timestampBeginIncluded = timestampBeginIncluded;
            doc.timestampEndNotIncluded = timestampEndNotIncluded;
        }
        // @ts-ignore
        let newBuild = new buildModel(doc);
        await newBuild.save();
        this.instance.builds.push(newBuild); // TODO it can be a setBuilds() method for rainZone
        await this.instance.save();
        return newBuild;
    }

    async purgeUselessBuilds(configuration: Configuration, buildType: string, allOldBuild = false) {

        const buildModel = this.buildModel;

        // global remove of old AND empty
        const beforeYesterday = new Date();
        beforeYesterday.setDate(beforeYesterday.getDate() - 1);
        // { statusGlobal: { $ne: 1 }
        await buildModel.deleteMany({updatedAt: {$lte: beforeYesterday}, statusWorkers: [], buildType});

        // now focus on not empty but
        const allBuilds = JSON.parse(JSON.stringify(this.instance.builds || this.instance.getBuilds()));
        let count = 0;
        for (const buildId of allBuilds) {
            const build: IBuild = await buildModel.findById(buildId);

            if (!build) {
                this.instance.builds.splice(count, 1);
                count--;
            } else {
                let shouldBeRemoved = build.statusGlobal !== 1;
                shouldBeRemoved = shouldBeRemoved && this.isOld(build);
                if (!allOldBuild) {
                    shouldBeRemoved = shouldBeRemoved && this.compareBuild(build, buildType, configuration);
                }
                if (shouldBeRemoved) {
                    this.instance.builds.splice(count, 1);
                    await buildModel.deleteOne({_id: buildId});
                    count--;
                }
            }

            count++;
        }

        await this.instance.save();
    }

    async hasSomethingInProgress(configuration: Configuration, buildType: string, allBuild = false) {
        const allBuilds = this.instance.builds || this.instance.getBuilds();
        let oneIsNotFinished = false;
        for (const buildId of allBuilds) {
            const build: IBuild = await this.buildModel.findById(buildId);

            let isInProgress = build?.statusGlobal !== 1;
            if (allBuild) {
                isInProgress = isInProgress && this.compareBuild(build, buildType, configuration);
            }

            if (isInProgress) {
                loggerFactory.getLogger().debug('hasSomethingInProgress:', buildId);
                oneIsNotFinished = true;
            }
        }
        return oneIsNotFinished;
    }

    async deleteBuild(buildId: string) {
        if (!buildId) {
            return;
        }

        const buildModel = this.buildModel;
        await buildModel.deleteOne({_id: buildId});

        const index = this.instance.builds.indexOf(buildId);
        this.instance.builds.splice(index, 1);
        await this.instance.save();
    }

    async hasErrorStacked(configuration: Configuration, buildType: string) {
        let errorStacks = '';
        const buildModel = this.buildModel;

        const allBuilds = this.instance.builds || this.instance.getBuilds();

        for (const buildId of allBuilds) {
            const build: IBuild = await buildModel.findById(buildId);
            if (this.compareBuild(build, buildType, configuration) &&
                typeof build.getErrorStack !== 'undefined') {
                errorStacks += build.getErrorStack();
            }
        }

        return errorStacks;
    }

    protected compareBuild(build: IBuild, buildType: string, configuration: Configuration): boolean {
        return build &&
            build.buildType === buildType &&
            // build.algorithmVersion === this.algorithmVersion &&
            configuration.contains(build.configurationAsJSON)
            ;
    }

    protected isOld(build: IBuild): boolean {
        if (!build) {
            return false;
        }

        const delta = new Date().getTime() - build.updatedAt.getTime();
        const old = delta > this.minutesBeforeGettingOld * 60000;

        if (old) {
            loggerFactory.getLogger().warn('old build?', old, build.id, delta, this.minutesBeforeGettingOld * 60000);
        }
        return old;

    }
}
