import { http, HttpResponse } from 'msw';
import type { ContentLockOverviewItem } from '../../api/types.gen';

const BASE = '/umbraco/contentlock/api/v1';

/** A sample locked item returned by the mock Lock endpoint */
export const MOCK_LOCK_ITEM: ContentLockOverviewItem = {
    key: 'dcf18a51-0000-0000-0000-000000000001',
    nodeName: 'Home',
    contentType: 'home',
    checkedOutBy: 'Admin User',
    checkedOutByKey: 'aaaaaaaa-0000-0000-0000-000000000001',
    lastEdited: new Date().toISOString(),
    lockedAtDate: new Date().toISOString(),
};

export const handlers = [
    /** Lock a content node — success */
    http.get(`${BASE}/Lock/:key`, () =>
        HttpResponse.json(MOCK_LOCK_ITEM, { status: 200 })
    ),

    /** Lock — already locked (bad request) */
    http.get(`${BASE}/Lock/already-locked`, () =>
        HttpResponse.json(
            { title: 'Already Locked', detail: 'This node is already locked by another user.', status: 400 },
            { status: 400 }
        )
    ),

    /** Unlock a content node — success */
    http.get(`${BASE}/Unlock/:key`, () =>
        new HttpResponse(null, { status: 200 })
    ),

    /** Unlock — not locked (bad request) */
    http.get(`${BASE}/Unlock/not-locked`, () =>
        HttpResponse.json(
            { title: 'Not Locked', detail: 'This node is not currently locked.', status: 400 },
            { status: 400 }
        )
    ),

    /** Bulk unlock — success */
    http.post(`${BASE}/BulkUnlock`, () =>
        new HttpResponse(null, { status: 200 })
    ),
];
