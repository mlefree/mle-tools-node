import {expect} from 'chai';
import {TimeTracking} from '../../src/';

describe('TimeTracking', () => {

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

    it('should log info', async () => {
        const timeTracking = new TimeTracking({milliSecBeforeWarning: 100});
        const middleware = timeTracking.use();
        // TODO better middlewares tests
        expect(middleware(req, res, next)).eq(undefined);
    });
});
