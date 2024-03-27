import {expect} from 'chai';
import {OSMetrics} from '../../src/tools/OSMetrics';

describe('OSMetrics', function () {

    before(() => {
    });

    it('should getMetrics', async () => {

        const metrics = await OSMetrics.getMetrics();
        expect(metrics.name).contains('_');
        expect(metrics.cpuPercent).lessThanOrEqual(100);
        expect(metrics.memoryPercent).lessThanOrEqual(100);
        expect(metrics.diskPercent).lessThanOrEqual(100);
    });

});

