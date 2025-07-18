import {expect} from 'chai';
import {OSMetrics} from '../../src';

describe('OSMetrics', () => {
    before(() => {});

    it('should getMetrics', async () => {
        const metrics = await OSMetrics.getMetrics();
        if (metrics.name && metrics.cpuPercent) {
            expect(metrics.name).contains('_');
            expect(metrics.cpuPercent).greaterThan(0);
            expect(metrics.cpuPercent).lessThanOrEqual(100);
            expect(metrics.memoryPercent).greaterThan(0);
            expect(metrics.memoryPercent).lessThanOrEqual(100);
            expect(metrics.diskPercent).lessThanOrEqual(100);
            expect(metrics.cpuTemperature ? metrics.cpuTemperature : 360).greaterThan(10);
            console.log('cpuPercent', metrics.cpuPercent);
            console.log('cpuTemperature', metrics.cpuTemperature);
        }
        // console.log('metrics', JSON.stringify(metrics, null, 3));
    });
});
