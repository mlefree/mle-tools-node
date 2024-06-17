import {expect} from 'chai';
import {timeTracking, TimeTrackingMiddleware} from '../../src/';

describe('TimeTrackingMiddleware', () => {

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
        const timeTracking = new TimeTrackingMiddleware({milliSecBeforeWarning: 100});
        const middleware = timeTracking.middleWare();
        expect(middleware(req, res, next)).eq(undefined);
    });

    it('should use simple timeTracking', async () => {
        expect(timeTracking({milliSecBeforeWarning: 100})(req, res, next)).eq(undefined);
    });

});
