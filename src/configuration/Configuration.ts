export class Configuration {

    private allValues: any;

    constructor(private defaultValues: { key: string, value: any }[],
                private allDomains: { domain: string, keys: string[] }[],
                configThatOverride?: JSON | string) {
        this.build(configThatOverride);
    }

    public getConf(domain?: string): JSON {
        let conf = this.allValues;
        if (!domain) {
            return conf;
        }

        const found = this.allDomains.filter(d => d.domain === domain);
        if (found.length !== 1) {
            return conf;
        }

        conf = {};
        for (const key of found[0].keys) {
            conf[key] = this.allValues[key];
        }

        return conf;
    }

    public getJSON(buildType?: string) {
        return JSON.stringify(this.getConf(buildType));
    }

    public contains(configurationAsString: Configuration | string) {
        let confToCompare = configurationAsString;
        try {
            if (typeof configurationAsString === 'string') {
                confToCompare = JSON.parse(configurationAsString);
            }
        } catch (e) {
        }

        const currentConf = this.getConf();
        for (let p in currentConf) {
            if (currentConf.hasOwnProperty(p) === confToCompare.hasOwnProperty(p)) {
                if (JSON.stringify(currentConf[p]) !== JSON.stringify(confToCompare[p])) {
                    return false;
                }
            }
        }

        return true;
    }

    public merge(configurationAsString: JSON | string) {
        if (!configurationAsString) {
            return;
        }

        let confToMerge: JSON = configurationAsString as JSON;
        try {
            if (typeof configurationAsString === 'string') {
                confToMerge = JSON.parse(configurationAsString);
            }
        } catch (e) {
        }

        const currentConf = this.getConf();
        for (let p in confToMerge) {
            if (confToMerge.hasOwnProperty(p) === currentConf.hasOwnProperty(p)) {
                currentConf[p] = confToMerge[p];
            }
        }

        this.build(currentConf);
    }

    public set(key: string, value: any) {
        const conf = this.getConf();
        if (conf.hasOwnProperty(key)) {
            conf[key] = value;
            this.build(conf);
        }
    }

    private build(configThatOverride: JSON | string) {

        this.allValues = {};

        try {
            if (typeof configThatOverride === 'string') {
                configThatOverride = JSON.parse(configThatOverride);
            }
        } catch (e) {
            // logger.warn('Configuration issue:', e);
        }

        for (const defaultValue of this.defaultValues) {
            this.allValues[defaultValue.key] = defaultValue.value;
        }

        if (configThatOverride) {
            for (const key of Object.keys(configThatOverride)) {
                if (configThatOverride.hasOwnProperty(key) && this.allValues.hasOwnProperty(key)) {
                    this.allValues[key] = configThatOverride[key];
                }
            }
        }

    }
}

