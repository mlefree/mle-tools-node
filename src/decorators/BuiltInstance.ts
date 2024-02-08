import {Configuration} from '../configuration/Configuration';
import {loggerFactory} from '../logs/LoggerFactory';
import {MError} from '../errors/MError';

export class BuiltInstance {

    constructor(
        private instance: any,
        private buildModel: any,
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
            const build = await buildModel.findById(buildId).exec();
            if (!build) {
                this.instance.builds.splice(index, 1);
                await this.instance.save();
            } else {
                if (build && build.buildType === buildType &&
                    configuration.contains(build.configurationAsJSON) &&
                    build.algorithmVersion === this.algorithmVersion) {
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
        let newBuild = new buildModel(doc);
        await newBuild.save();
        this.instance.builds.push(newBuild); // TODO it can be a setBuilds() method for rainZone
        await this.instance.save();
        return newBuild;
    }

    async purgeUselessBuilds(configuration: Configuration, buildType: string) {

        const buildModel = this.buildModel;

        // global remove of old and empty
        const beforeYesterday = new Date();
        beforeYesterday.setDate(beforeYesterday.getDate() - 1);
        // { statusGlobal: { $ne: 1 }
        await buildModel.deleteMany({updatedAt: {$lte: beforeYesterday}, statusWorkers: [], buildType});

        // now focus on not empty but
        const allBuilds = this.instance.builds || this.instance.getBuilds();
        let count = 0;
        for (const buildId of allBuilds) {
            const build = await buildModel.findById(buildId);

            if (build &&
                build.buildType === buildType &&
                configuration.contains(build.configurationAsJSON) &&
                build.algorithmVersion === this.algorithmVersion &&
                build.statusGlobal !== 1) {

                const hasNotBeenUpdatedForAWhile = new Date().getTime() - build.updatedAt.getTime() > this.minutesBeforeGettingOld * 600; // more than
                if (hasNotBeenUpdatedForAWhile) {
                    loggerFactory.getLogger().warn('UselessBuilds purged', buildId);
                    this.instance.builds.splice(count, 1);
                    await buildModel.deleteOne({_id: buildId});
                    count--;
                }
            }
            count++;
        }

        await this.instance.save();
    }

    async hasSomethingInProgress() {
        const allBuilds = this.instance.builds || this.instance.getBuilds();
        let oneIsNotFinished = false;
        for (const buildId of allBuilds) {
            const build = await this.buildModel.findById(buildId);

            if (build &&
                build.statusGlobal !== 1) {
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
            const build = await buildModel.findById(buildId);
            // TODO Build.getCompliantBuild can check if last build is finished ? or too old ?
            if (build &&
                build.buildType === buildType &&
                configuration.contains(build.configurationAsJSON) &&
                build.algorithmVersion === this.algorithmVersion) {
                errorStacks += build.getErrorStack();
            }
        }

        return errorStacks;
    }
}
