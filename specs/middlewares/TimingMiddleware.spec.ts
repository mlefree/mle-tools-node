import {expect} from 'chai';
import {timing, TimingMiddleware} from '../../src/';

describe('TimingMiddleware', () => {

    const req = {};
    const res = {
        on: (a) => {
            return a;
        },
    };
    const next = () => {
    };

    before(() => {
    });

    it('should create time tracking', async () => {
        const timingMiddleware = new TimingMiddleware();
        const middleware = timingMiddleware.middleWare();
        expect(middleware(req, res, next)).eq(undefined);
    });

    it('should use simple timeTracking', async () => {
        expect(timing()(req, res, next)).eq(undefined);
    });

});
