import {loggerFactory} from './LoggerFactory';

const PERF_DISABLE_LOG = false;
const PERF_WHITE_LIST = [
    // 'WorkerProcessor.loadRadarsToBuild',
];
const PERF_INFOS = {};
const PERF_RIGHT_TIME_TO_SEND_SOME_NEWS = 30000; // = 30 sec

export class LoggerPerf {
    private readonly name: string;
    private startDate: Date;
    private lastUpdateDate: Date;

    constructor(name: string) {
        if (PERF_DISABLE_LOG) {
            return;
        }

        this.name = name;
        this.startDate = new Date();
        this.lastUpdateDate = new Date();
        loggerFactory.getLogger().info(`(PERF) - "${this.name}" started ###`);
    }

    finished() {
        if (PERF_DISABLE_LOG) {
            return;
        }

        const secSpent = (new Date().getTime() - this.startDate.getTime()) / 1000;
        this._logDetails();
        loggerFactory.getLogger().info(`(PERF) - "${this.name}" finished in ${secSpent} sec ###`);
    }

    inspectBegin(domain) {
        const domainName = this.name + '.' + domain;
        if (PERF_DISABLE_LOG) {
            return;
        }

        if (PERF_WHITE_LIST.length > 0 && PERF_WHITE_LIST.indexOf(domainName) < 0) {
            return;
        }

        this._initDomain(domainName);
        const domainObject = PERF_INFOS[domainName];
        domainObject.name = '' + domainName;
        domainObject.lastBeginDate = new Date();
    }

    inspectEnd(domain: string): number {
        const domainName = this.name + '.' + domain;
        if (PERF_DISABLE_LOG) {
            return 0;
        }

        if (PERF_WHITE_LIST.length > 0 && PERF_WHITE_LIST.indexOf(domainName) < 0) {
            return 0;
        }

        // this._initDomain(domain);
        const domainObject = PERF_INFOS[domainName];
        domainObject.count++;
        domainObject.timeSpent += new Date().getTime() - domainObject.lastBeginDate.getTime();

        if (this._isGoodTimeForNews()) {
            this._logDetails(true);
        }
        return domainObject.timeSpent;
    }

    _initDomain(domainName: string) {
        if (!(domainName in PERF_INFOS)) {
            PERF_INFOS[domainName] = {
                name: null,
                count: 0,
                timeSpent: 0,
                lastBeginDate: null,
            };
        }
    }

    _isGoodTimeForNews() {
        const diff = new Date().getTime() - this.lastUpdateDate.getTime();
        if (diff < PERF_RIGHT_TIME_TO_SEND_SOME_NEWS) {
            return false;
        }
        this.lastUpdateDate = new Date();
        return true;
    }

    _logDetails(intermediate?: boolean) {
        let domains = [];
        loggerFactory.getLogger().info(`
        ########## PERF UPDATE BEGIN ##########`);
        const intermediateMsg = intermediate ? '(for now) ' : '';
        for (const domainName in PERF_INFOS) {
            const domainObject = PERF_INFOS[domainName];
            domains.push(domainObject);
            // logger.info(`PERF - ${intermediateMsg}${domainName} COUNT: ${domainObject.count} TST: ${domainObject.timeSpent / 1000} sec.
            // TSA: ${domainObject.timeSpent / 1000 / domainObject.count} sec.`);
        }

        domains = domains.sort((a, b) => {
            // BCA : return (b.timeSpent / b.count) - (a.timeSpent / a.count);
            return b.timeSpent - a.timeSpent;
        });
        // const biggestConsumer = domains[0];
        // const biggestConsumerAverage = (biggestConsumer.timeSpent / 1000) / biggestConsumer.count;
        // const biggestConsumerTotal = (biggestConsumer.timeSpent / 1000);
        // logger.info(`PERF - ${intermediateMsg}BCA: ${biggestConsumer.name} TSA: ${biggestConsumerAverage}`);
        // logger.info(`PERF - ${intermediateMsg}BCT: ${biggestConsumer.name} TST: ${biggestConsumerTotal}`);
        domains.forEach((domain) => {
            loggerFactory
                .getLogger()
                .info(
                    `PERF - ${intermediateMsg}${domain.name} COUNT: ${domain.count} TST: ${domain.timeSpent / 1000} sec. TSA: ${domain.timeSpent / 1000 / domain.count} sec.`
                );
        });

        loggerFactory.getLogger().info(`
        ########## PERF UPDATE END ##########
        `);
    }
}
