import { expect } from '@open-wc/testing';
import { sortByDate } from './sortByDate.js';

// Displayed dates are locale strings, so sorting must use the raw timestamps
const dates: Record<string, string> = {
    june: '2026-06-08T20:59:46Z',
    october: '2026-10-29T11:00:43Z',
    morning: '2026-10-29T09:00:00Z',
};
const items = [{ id: 'october' }, { id: 'june' }, { id: 'morning' }];

describe('sortByDate', () => {
    it('sorts ascending by actual date, not by formatted text', () => {
        expect(sortByDate(items, false, id => dates[id]).map(i => i.id)).to.deep.equal(['june', 'morning', 'october']);
    });

    it('sorts descending', () => {
        expect(sortByDate(items, true, id => dates[id]).map(i => i.id)).to.deep.equal(['october', 'morning', 'june']);
    });

    it('puts items without a date first when ascending', () => {
        expect(sortByDate([...items, { id: 'missing' }], false, id => dates[id])[0].id).to.equal('missing');
    });

    it('does not mutate the input', () => {
        const input = [...items];
        sortByDate(input, false, id => dates[id]);
        expect(input.map(i => i.id)).to.deep.equal(['october', 'june', 'morning']);
    });
});
