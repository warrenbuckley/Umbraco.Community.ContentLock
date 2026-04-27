/**
 * Unit tests for the workspace footer app Lit element.
 *
 * The element renders different UI depending on which user holds the lock
 * (or whether the node is unlocked). Because the element depends on the Umbraco
 * context system (consumeContext), we bypass context setup and drive the
 * private `pageState` reactive property directly so we can focus on rendering
 * logic without a full Umbraco host tree.
 */
import { fixture, expect } from '@open-wc/testing';
import { html } from '@umbraco-cms/backoffice/external/lit';
import PageState from '../enums/PageStateEnum.js';
import './contentlock.workspacefooterapp.js';
import type { ContentLockWorkspaceFooterAppElement } from './contentlock.workspacefooterapp.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mount the footer app and set its page state, then wait for a render. */
async function mountWithState(state: PageState): Promise<ContentLockWorkspaceFooterAppElement> {
    const el = await fixture<ContentLockWorkspaceFooterAppElement>(
        html`<contentlock-workspacefooterapp></contentlock-workspacefooterapp>`
    );
    // Drive the private reactive property directly so we test rendering logic
    // without needing a full Umbraco context tree.
    (el as unknown as Record<string, unknown>)['pageState'] = state;
    await el.updateComplete;
    return el;
}

/** Convenience: get the shadow root (asserts it exists). */
function shadow(el: ContentLockWorkspaceFooterAppElement): ShadowRoot {
    expect(el.shadowRoot).to.not.be.null;
    return el.shadowRoot!;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContentLockWorkspaceFooterApp', () => {
    describe('when the page is unlocked', () => {
        it('renders nothing for PageState.Unlocked', async () => {
            const el = await mountWithState(PageState.Unlocked);
            // The switch returns `nothing` → shadow root has no visible children
            expect(shadow(el).querySelector('#message')).to.be.null;
        });

        it('renders nothing for the initial PageState.Loading state', async () => {
            // Component starts in Loading; no context is available in this test
            const el = await fixture<ContentLockWorkspaceFooterAppElement>(
                html`<contentlock-workspacefooterapp></contentlock-workspacefooterapp>`
            );
            await el.updateComplete;
            expect(shadow(el).querySelector('#message')).to.be.null;
        });
    });

    describe('when the page is locked by the current user', () => {
        it('renders the #message container', async () => {
            const el = await mountWithState(PageState.LockedByYou);
            expect(shadow(el).querySelector('#message')).to.not.be.null;
        });

        it('renders a warning-coloured lock badge', async () => {
            const el = await mountWithState(PageState.LockedByYou);
            const badge = shadow(el).querySelector('uui-badge');
            expect(badge).to.not.be.null;
            expect(badge?.getAttribute('color')).to.equal('warning');
        });

        it('renders a lock icon inside the badge', async () => {
            const el = await mountWithState(PageState.LockedByYou);
            const icon = shadow(el).querySelector('uui-icon');
            expect(icon?.getAttribute('name')).to.equal('icon-lock');
        });
    });

    describe('when the page is locked by another user', () => {
        it('renders the #message container', async () => {
            const el = await mountWithState(PageState.LockedByAnother);
            expect(shadow(el).querySelector('#message')).to.not.be.null;
        });

        it('renders a danger-coloured lock badge', async () => {
            const el = await mountWithState(PageState.LockedByAnother);
            const badge = shadow(el).querySelector('uui-badge');
            expect(badge).to.not.be.null;
            expect(badge?.getAttribute('color')).to.equal('danger');
        });
    });

    describe('reactive state transitions', () => {
        it('updates from LockedByYou to Unlocked and removes the message', async () => {
            const el = await mountWithState(PageState.LockedByYou);
            expect(shadow(el).querySelector('#message')).to.not.be.null;

            (el as unknown as Record<string, unknown>)['pageState'] = PageState.Unlocked;
            await el.updateComplete;
            expect(shadow(el).querySelector('#message')).to.be.null;
        });

        it('updates from LockedByAnother to LockedByYou and changes the badge colour', async () => {
            const el = await mountWithState(PageState.LockedByAnother);
            expect(shadow(el).querySelector('uui-badge')?.getAttribute('color')).to.equal('danger');

            (el as unknown as Record<string, unknown>)['pageState'] = PageState.LockedByYou;
            await el.updateComplete;
            expect(shadow(el).querySelector('uui-badge')?.getAttribute('color')).to.equal('warning');
        });
    });
});
