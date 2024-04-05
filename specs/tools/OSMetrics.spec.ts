import {expect} from 'chai';
import {OSMetrics} from '../../src/tools/OSMetrics';

describe('OSMetrics', function () {

    before(() => {
    });

    it('should getMetrics', async () => {

        const metrics = await OSMetrics.getMetrics();
        expect(metrics.name).contains('_');
        expect(metrics.cpuPercent).greaterThan(0);
        expect(metrics.cpuPercent).lessThanOrEqual(100);
        expect(metrics.memoryPercent).greaterThan(0);
        expect(metrics.memoryPercent).lessThanOrEqual(100);
        expect(metrics.diskPercent).lessThanOrEqual(100);
        console.log('cpuPercent', metrics.cpuPercent);
        // console.log('metrics', JSON.stringify(metrics, null, 3));
    });

});

