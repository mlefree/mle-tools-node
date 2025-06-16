import {expect} from 'chai';
import {cpuTemperature, cpuUsage, freememPercentage} from '../../src/tools/OSUtils';

describe('OSUtils', () => {
    describe('freememPercentage', () => {
        it('should return a number between 0 and 1', () => {
            const result = freememPercentage();
            expect(result).to.be.a('number');
            expect(result).to.be.at.least(0);
            expect(result).to.be.at.most(1);
        });
    });

    describe('cpuUsage', () => {
        it('should return a number between 0 and 1', async () => {
            const result = await cpuUsage();
            expect(result).to.be.a('number');
            expect(result).to.be.at.least(0);
            expect(result).to.be.at.most(1);
        });
    });

    describe('cpuTemperature', () => {
        it('should return an object with temperature information', async () => {
            const result = await cpuTemperature();
            expect(result).to.be.an('object');
            // Note: We can't make specific assertions about the temperature values
            // as they depend on the system and might not be available on all platforms
        });
    });
});
