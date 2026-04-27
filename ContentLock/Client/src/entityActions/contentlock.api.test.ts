/**
 * API integration tests for ContentLockService using Mock Service Worker.
 *
 * MSW intercepts fetch requests so the service can be exercised without a real
 * .NET backend. The default `baseUrl` in the generated client points to the
 * live dev server (https://localhost:44378); we override it here to make
 * requests relative so they are served on the same origin as the test runner
 * and can therefore be intercepted by the MSW service worker.
 */
import { expect } from '@open-wc/testing';
import { http, HttpResponse } from 'msw';
import { worker, } from '../tests/msw/browser.js';
import { MOCK_LOCK_ITEM } from '../tests/msw/handlers.js';
import { ContentLockService } from '../api/sdk.gen.js';
import { client } from '../api/client.gen.js';

before(async () => {
    // Use relative URLs so MSW can intercept them on the test-runner origin
    client.setConfig({ baseUrl: '' });
    await worker.start({ onUnhandledRequest: 'bypass' });
});

after(() => worker.stop());

afterEach(() => worker.resetHandlers());

// ---------------------------------------------------------------------------
// lockContent
// ---------------------------------------------------------------------------

describe('ContentLockService.lockContent()', () => {
    it('returns the locked item on success', async () => {
        const { data, error } = await ContentLockService.lockContent({
            path: { key: MOCK_LOCK_ITEM.key },
        });

        expect(error).to.be.undefined;
        expect(data).to.deep.equal(MOCK_LOCK_ITEM);
    });

    it('returns an error when the node is already locked', async () => {
        // Override default handler to simulate a 400 conflict
        worker.use(
            http.get('/umbraco/contentlock/api/v1/Lock/:key', () =>
                HttpResponse.json(
                    { title: 'Already Locked', detail: 'This node is already locked.', status: 400 },
                    { status: 400 }
                )
            )
        );

        const { data, error } = await ContentLockService.lockContent({
            path: { key: 'some-key' },
        });

        expect(data).to.be.undefined;
        expect(error).to.not.be.undefined;
    });

    it('returns an error on 401 Unauthorized', async () => {
        worker.use(
            http.get('/umbraco/contentlock/api/v1/Lock/:key', () =>
                new HttpResponse(null, { status: 401 })
            )
        );

        const { data, error } = await ContentLockService.lockContent({
            path: { key: 'some-key' },
        });

        expect(data).to.be.undefined;
        expect(error).to.not.be.undefined;
    });
});

// ---------------------------------------------------------------------------
// unlockContent
// ---------------------------------------------------------------------------

describe('ContentLockService.unlockContent()', () => {
    it('returns no error on successful unlock', async () => {
        const { error } = await ContentLockService.unlockContent({
            path: { key: MOCK_LOCK_ITEM.key },
        });

        expect(error).to.be.undefined;
    });

    it('returns an error when the node is not locked', async () => {
        worker.use(
            http.get('/umbraco/contentlock/api/v1/Unlock/:key', () =>
                HttpResponse.json(
                    { title: 'Not Locked', detail: 'This node is not currently locked.', status: 400 },
                    { status: 400 }
                )
            )
        );

        const { error } = await ContentLockService.unlockContent({
            path: { key: 'not-locked-key' },
        });

        expect(error).to.not.be.undefined;
    });
});

// ---------------------------------------------------------------------------
// bulkUnlock
// ---------------------------------------------------------------------------

describe('ContentLockService.bulkUnlock()', () => {
    it('returns no error on successful bulk unlock', async () => {
        const { error } = await ContentLockService.bulkUnlock({
            body: [MOCK_LOCK_ITEM.key, 'another-key'],
        });

        expect(error).to.be.undefined;
    });
});
