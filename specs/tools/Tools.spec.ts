import {expect} from 'chai';
import {Tools} from '../../src';

describe('Tools', function () {

    before(() => {
    });

    it('should securedSetProperty', async () => {

        let src = {
            test: 1
        };
        let target = {};

        Tools.securedSetProperty(src, target, 'notExist');
        expect(target['notExist']).eq(undefined);
        expect(target['test']).eq(undefined);

        Tools.securedSetProperty(src, target, 'test');
        expect(target['test']).eq(1);
        Tools.securedSetProperty(src, target, 'test');
        expect(target['test']).eq(1);
    });

    it('should extractOrderedNames', async () => {

        let src = 'test1-test2-test1-notExisting-test1';
        let possibleNames = ['test1', 'test2', 'notHere'];

        const orderedNames = Tools.extractOrderedNames(src, possibleNames);

        expect(orderedNames.length).eq(4);
        expect(orderedNames[0]).eq('test1');
        expect(orderedNames[1]).eq('test2');
        expect(orderedNames[2]).eq('test1');
        expect(orderedNames[3]).eq('test1');
    });

});

