/**
 * Sorts by the raw date of each item; the table only holds locale-formatted
 * strings, which do not sort chronologically (e.g. "6/8/2026" after "10/29/2026").
 */
export function sortByDate<T extends { id: string }>(items: Array<T>, desc: boolean, dateOf: (id: string) => string | undefined): Array<T> {
    const time = (item: T) => Date.parse(dateOf(item.id) ?? '') || 0;
    return [...items].sort((a, b) => desc ? time(b) - time(a) : time(a) - time(b));
}
