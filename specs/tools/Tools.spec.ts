import {expect} from 'chai';
import {Tools} from '../../src';

describe('Tools', () => {

    before(() => {
    });

    it('should securedSetProperty', async () => {

        const src = {
            test: 1
        };
        const target = {};

        Tools.securedSetProperty(src, target, 'notExist');
        expect(target['notExist']).eq(undefined);
        expect(target['test']).eq(undefined);

        Tools.securedSetProperty(src, target, 'test');
        expect(target['test']).eq(1);
        Tools.securedSetProperty(src, target, 'test');
        expect(target['test']).eq(1);
    });

    it('should extractOrderedNames', async () => {

        const src = 'test1-test2-test1-notExisting-test1';
        const possibleNames = ['test1', 'test2', 'notHere'];

        const orderedNames = Tools.extractOrderedNames(src, possibleNames);

        expect(orderedNames.length).eq(4);
        expect(orderedNames[0]).eq('test1');
        expect(orderedNames[1]).eq('test2');
        expect(orderedNames[2]).eq('test1');
        expect(orderedNames[3]).eq('test1');
    });

});
