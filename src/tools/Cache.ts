import {loggerFactory} from '../logs';

const cachePerfLogger = loggerFactory.getPerfLogger('Cache');

export class Cache {

    private _cache: any;

    constructor() {
        this._clean();
    }

    async cacheFind(model: any, condition: any) {
        cachePerfLogger.inspectBegin('cache.cacheFind');
        const modelName = model.modelName;
        const conditionAsString = JSON.stringify(condition);

        if (this._cache[modelName] && this._cache[modelName][conditionAsString]) {
            cachePerfLogger.inspectEnd('cache.cacheFind');
            return this._cache[modelName][conditionAsString].results;
        } else if (!this._cache[modelName]) {
            this._cache[modelName] = {};
        }

        try {
            const records = await model.find(condition);
            // const recordsWithId = records.map(r => {
            //     if (r && r._doc && typeof r._doc.id === 'string') {
            //         r._id = r._doc.id; // new ObjectId(r._doc.id);
            //     }
            //     return r;
            // });
            this._cache[modelName][conditionAsString] = {results: records};
        } catch (err) {
        }
        cachePerfLogger.inspectEnd('cache.cacheFind');
    }

    async cacheSave(model, instanceToAdd, condition, unique = false) {
        cachePerfLogger.inspectBegin('cache.cacheSave');

        const modelName = model.modelName;
        const conditionAsString = JSON.stringify(condition);

        if (!this._cache[modelName]) {
            this._cache[modelName] = {};
        }

        if (!this._cache[modelName][conditionAsString]) {
            this._cache[modelName][conditionAsString] = {results: []};
        }

        if (!unique) {
            const index = this._cache[modelName][conditionAsString].results.findIndex(r => r.id === instanceToAdd.id);
            if (index === -1) {
                this._cache[modelName][conditionAsString].results.push(instanceToAdd);
                cachePerfLogger.inspectEnd('cache.cacheSave');
                return instanceToAdd;
            }
            cachePerfLogger.inspectEnd('cache.cacheSave');
            return this._cache[modelName][conditionAsString].results[index];
        } else {
            cachePerfLogger.inspectEnd('cache.cacheSave');
            this._cache[modelName][conditionAsString].results = [instanceToAdd];
            return instanceToAdd;
        }
    }

    async resolve() {
        cachePerfLogger.inspectBegin('cache.resolve');

        let count = 0;
        for (const model in this._cache) {
            if (this._cache.hasOwnProperty(model)) {
                for (const condition in this._cache[model]) {
                    if (this._cache[model].hasOwnProperty(condition)) {
                        const all = this._cache[model][condition].results;
                        for (let i = 0; i < all.length; i++) {
                            const instance = all[i];
                            await instance.save();
                            count++;
                        }
                    }
                }
            }
        }

        this._clean();
        cachePerfLogger.inspectEnd('cache.resolve');
        return count;
    }

    protected _clean() {
        this._cache = {};
    }

}
