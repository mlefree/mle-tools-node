import {loggerFactory} from '../logs';
import {MError} from '../errors';

const WORKER_TIME_TO_CONSIDER_AS_OLD_WORKER = 600000; // 10mn or 1 hour (3600000)

export class WorkerStatus {
    private startDate: Date;
    private stepCounter: number;

    constructor(
        public name: string,
        public workerInstance: any,
        public workerModel: any
    ) {
        if (
            !workerInstance ||
            typeof workerInstance.statusGlobal === 'undefined' ||
            !workerInstance.updatedAt ||
            typeof workerInstance.save === 'undefined' ||
            !workerInstance.statusWorkers
        ) {
            throw new MError(
                `WorkerStatus named "${name}" - "${workerInstance?._id?.toString()}" needs a compliant workerInstance.'`
            );
        }

        this.startDate = new Date();
        this.stepCounter = 0;
    }

    static AddConditionToMakeSureThatWorkerIsAlive(workerCondition) {
        const noNewsDeadline = new Date();
        noNewsDeadline.setTime(noNewsDeadline.getTime() - WORKER_TIME_TO_CONSIDER_AS_OLD_WORKER);
        workerCondition.updatedAt = {$gt: noNewsDeadline};
        workerCondition.statusGlobal = {$ne: 1};
    }

    static AddConditionToMakeSureThatWorkerIsFinished(workerCondition) {
        workerCondition.statusGlobal = 1;
    }

    protected static async CleanOldStatus(workerInstance, workerModel) {
        const oneHourOld = new Date();
        oneHourOld.setHours(oneHourOld.getHours() - 1);
        let changeDone = false;

        const statusWorkers = [];
        for (let i = 0; i < workerInstance.statusWorkers.length; i++) {
            if (workerInstance.statusWorkers[i].updated) {
                const date = new Date(workerInstance.statusWorkers[i].updated);
                const outdatedInProgress =
                    workerInstance.statusWorkers[i].status !== 1 &&
                    date.getTime() < oneHourOld.getTime();
                if (outdatedInProgress) {
                    changeDone = true;
                } else {
                    statusWorkers.push(workerInstance.statusWorkers[i]);
                }
            }
        }

        if (changeDone) {
            loggerFactory.getLogger().debug('[mtn] worker has done changes', workerInstance._id);
            await workerModel.updateOne({_id: workerInstance._id}, {statusWorkers});
        }
    }

    async init() {
        await WorkerStatus.CleanOldStatus(this.workerInstance, this.workerModel);
    }

    async goToTheNextStep(explanation?: string) {
        this.stepCounter++;
        const message = `WORKER - "${this.name}" go next: ${this.stepCounter} ${explanation}`;
        loggerFactory.getLogger().info(message);
    }

    async finished(err?: string) {
        const timeSpent = Math.round((new Date().getTime() - this.startDate.getTime()) / 1000);
        let message = `WORKER - "${this.name}" has finished in ${timeSpent} sec`;

        let step = 0.1 * this.stepCounter;
        if (err) {
            message += err ? ` with some errors : ${err}` : '';
            loggerFactory.getLogger().error(message);
        } else {
            loggerFactory.getLogger().info(message);
            this.stepCounter++;
            step = 1;
        }

        await this._saveCurrentStep(step, message, 100, err);
    }

    async hasSomethingInProgress() {
        const worker = await this.workerModel
            .findOne({_id: this.workerInstance._id})
            .populate('statusWorkers');

        let oneIsNotFinished = false;
        for (const statusWorker of worker.statusWorkers) {
            if (statusWorker.status !== 1) {
                oneIsNotFinished = true;
            }
        }
        return oneIsNotFinished;
    }

    protected async _saveCurrentStep(
        step: number,
        explanation?: string,
        percent?: number,
        errorStack?: string
    ) {
        let allWorkersAreAtLeastOnTheSameStatus = true;
        if (!this.workerInstance) {
            return allWorkersAreAtLeastOnTheSameStatus;
        }

        const now = new Date();
        explanation += percent && percent < 100 ? ` in progress: ${percent}%` : ``;

        if (this.workerInstance.statusWorkers.filter((w) => w.name === this.name).length === 0) {
            this.workerInstance.statusWorkers.push({
                name: this.name,
                status: step,
                explanation,
                updated: now,
            });
            await this.workerInstance.save();
        }

        const workerUpdate = {
            'statusWorkers.$[i].status': step,
            'statusWorkers.$[i].explanation': explanation,
            'statusWorkers.$[i].updated': now,
        };
        if (errorStack) {
            workerUpdate['statusWorkers.$[i].errorStack'] = errorStack;
        }

        await this.workerModel.updateOne({_id: this.workerInstance._id}, workerUpdate, {
            arrayFilters: [{'i.name': this.name}],
        });

        const resp = await this.workerModel.findOne(
            {_id: this.workerInstance._id, 'statusWorkers.status': {$lt: step}},
            {'statusWorkers.$': 1}
        );
        if (resp) {
            allWorkersAreAtLeastOnTheSameStatus = false;
        }

        if (allWorkersAreAtLeastOnTheSameStatus) {
            await this.workerModel.updateOne({_id: this.workerInstance._id}, {statusGlobal: step});
        }

        return allWorkersAreAtLeastOnTheSameStatus;
    }
}
