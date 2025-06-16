import {expect} from 'chai';
import {timeTracking, TimeTrackingMiddleware} from '../../src/';

describe('TimeTrackingMiddleware', () => {
    const req = {};
    const res = {
        on: (a) => {
            return a;
        },
    };
    const next = () => {};

    before(() => {});

    it('should create time tracking', async () => {
        const timeTrackingMiddleware = new TimeTrackingMiddleware({milliSecBeforeWarning: 100});
        const middleware = timeTrackingMiddleware.middleWare();
        expect(middleware(req, res, next)).eq(undefined);
    });

    it('should use simple timeTracking', async () => {
        expect(timeTracking({milliSecBeforeWarning: 100})(req, res, next)).eq(undefined);
    });
});
