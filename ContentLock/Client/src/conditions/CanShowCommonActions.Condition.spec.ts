import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CanShowCommonActionsCondition, { CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS } from './CanShowCommonActions.Condition'; // Adjusted import for default export
import { UMB_ENTITY_CONTEXT } from '@umbraco-cms/backoffice/entity';
import { UMB_CURRENT_USER_CONTEXT } from '@umbraco-cms/backoffice/current-user';
import { CONTENTLOCK_SIGNALR_CONTEXT } from '../globalContexts/contentlock.signalr.context';
import { BehaviorSubject } from 'rxjs';
import type { UmbControllerHost } from '@umbraco-cms/backoffice/controller-api';

// Mock Umbraco contexts and modules
// IMPORTANT: These mocks should be at the top level of the test file, before any describe blocks.
vi.mock('@umbraco-cms/backoffice/context-api'); 
vi.mock('@umbraco-cms/backoffice/observable-api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    observeMultiple: vi.fn((observables, callback) => {
      let lastValues = new Array(observables.length).fill(undefined);
      const subscriptions = observables.map((obs, index) => {
        return obs.subscribe(value => {
          lastValues[index] = value;
          if (lastValues.every(v => v !== undefined)) {
            callback([...lastValues]);
          }
        });
      });
      return { unsubscribe: () => subscriptions.forEach(sub => sub.unsubscribe()) };
    }),
  };
});

// Mock specific context tokens by re-exporting them as Symbols or mock functions if needed
vi.mock('@umbraco-cms/backoffice/entity', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, UMB_ENTITY_CONTEXT: Symbol.for('UMB_ENTITY_CONTEXT_TOKEN_TEST') }; // Use Symbol.for for consistent symbols
});
vi.mock('@umbraco-cms/backoffice/current-user', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, UMB_CURRENT_USER_CONTEXT: Symbol.for('UMB_CURRENT_USER_CONTEXT_TOKEN_TEST') };
});
vi.mock('../globalContexts/contentlock.signalr.context', async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, CONTENTLOCK_SIGNALR_CONTEXT: Symbol.for('CONTENTLOCK_SIGNALR_CONTEXT_TOKEN_TEST') };
});


describe('CanShowCommonActionsCondition', () => {
  let mockHost: UmbControllerHost;
  
  let entityUnique$: BehaviorSubject<string | undefined>;
  let currentUserObservable$: BehaviorSubject<{ unique: string } | null>;
  let isNodeLocked$: BehaviorSubject<boolean>;
  let isNodeLockedByMe$: BehaviorSubject<boolean>;

  let mockEntityContext: any;
  let mockCurrentUserContext: any;
  let mockSignalRContext: any;

  beforeEach(() => {
    entityUnique$ = new BehaviorSubject<string | undefined>(undefined);
    currentUserObservable$ = new BehaviorSubject<{ unique: string } | null>(null);
    isNodeLocked$ = new BehaviorSubject<boolean>(false);
    isNodeLockedByMe$ = new BehaviorSubject<boolean>(false);

    mockEntityContext = {
      unique: entityUnique$.asObservable(), // This should be the observable for unique
    };

    mockCurrentUserContext = {
      currentUser: currentUserObservable$.asObservable(),
    };

    mockSignalRContext = {
      isNodeLocked: vi.fn(() => isNodeLocked$.asObservable()),
      isNodeLockedByMe: vi.fn(() => isNodeLockedByMe$.asObservable()),
    };
    
    const contextConsumers = new Map();
    // Use the actual imported symbols (which are now mocked) as keys
    contextConsumers.set(UMB_ENTITY_CONTEXT, mockEntityContext);
    contextConsumers.set(UMB_CURRENT_USER_CONTEXT, mockCurrentUserContext);
    contextConsumers.set(CONTENTLOCK_SIGNALR_CONTEXT, mockSignalRContext);

    mockHost = {
      consumeContext: vi.fn((token, callback) => {
        if (contextConsumers.has(token)) {
          callback(contextConsumers.get(token));
        } else {
          // console.warn(`Mock consumeContext: Token ${token?.toString()} not found`);
        }
      }),
      observe: vi.fn((observable, callback) => {
        const subscription = observable.subscribe(callback);
        return { unsubscribe: () => subscription.unsubscribe() };
      }),
      getHostElement: () => document.createElement('div'),
      destroy: vi.fn(),
    } as unknown as UmbControllerHost;
  });

  afterEach(() => {
    vi.clearAllMocks();
    entityUnique$.complete();
    currentUserObservable$.complete();
    isNodeLocked$.complete();
    isNodeLockedByMe$.complete();
  });

  const createCondition = () => {
    const condition = new CanShowCommonActionsCondition(mockHost, {
      alias: CONTENTLOCK_CAN_SHOW_COMMON_ACTIONS_CONDITION_ALIAS, // Use the actual alias
      config: {},
    });
    return condition;
  };

  it('should permit when node is not locked', (done) => {
    const condition = createCondition();
    
    const sub = condition.onPermittedChange(() => {
      if (entityUnique$.getValue() && currentUserObservable$.getValue()?.unique) {
        expect(condition.permitted).toBe(true);
        condition.destroy();
        sub.unsubscribe();
        done();
      }
    });

    entityUnique$.next('doc-123');
    currentUserObservable$.next({ unique: 'user-abc' });
    isNodeLocked$.next(false);
    isNodeLockedByMe$.next(false); 
  });

  it('should permit when node is locked by the current user', (done) => {
    const condition = createCondition();

    const sub = condition.onPermittedChange(() => {
      if (entityUnique$.getValue() && currentUserObservable$.getValue()?.unique) {
        expect(condition.permitted).toBe(true);
        condition.destroy();
        sub.unsubscribe();
        done();
      }
    });
    
    entityUnique$.next('doc-123');
    currentUserObservable$.next({ unique: 'user-abc' });
    isNodeLocked$.next(true);
    isNodeLockedByMe$.next(true);
  });

  it('should NOT permit when node is locked by another user', (done) => {
    const condition = createCondition();
    
    const sub = condition.onPermittedChange(() => {
      if (entityUnique$.getValue() && currentUserObservable$.getValue()?.unique) {
        expect(condition.permitted).toBe(false);
        condition.destroy();
        sub.unsubscribe();
        done();
      }
    });

    entityUnique$.next('doc-123');
    currentUserObservable$.next({ unique: 'user-abc' }); 
    isNodeLocked$.next(true);    
    isNodeLockedByMe$.next(false); 
  });
  
  it('should update permitted status when entity unique becomes available later', (done) => {
    const condition = createCondition();
    let initialPermittedStatusCaptured = false;

    const sub = condition.onPermittedChange(() => {
        if (entityUnique$.getValue() === 'doc-xyz' && currentUserObservable$.getValue()?.unique === 'user-abc') {
             expect(condition.permitted).toBe(true);
             condition.destroy();
             sub.unsubscribe();
             done();
        } else if (!initialPermittedStatusCaptured && !entityUnique$.getValue()) {
            initialPermittedStatusCaptured = true;
        }
    });
    
    currentUserObservable$.next({ unique: 'user-abc' });
    isNodeLocked$.next(false);
    
    entityUnique$.next('doc-xyz'); 
  });

  it('should react to changes in lock status from SignalR', (done) => {
    const condition = createCondition();
    let changeCount = 0;

    entityUnique$.next('doc-123');
    currentUserObservable$.next({ unique: 'user-abc' });
    isNodeLocked$.next(false); // Initial: Unlocked

    const sub = condition.onPermittedChange(() => {
      if (!entityUnique$.getValue() || !currentUserObservable$.getValue()?.unique) return;

      changeCount++;
      if (changeCount === 1) { // Initial state (unlocked)
        expect(condition.permitted).toBe(true);
        isNodeLocked$.next(true);
        isNodeLockedByMe$.next(false);
      } else if (changeCount === 2 ) { // Locked by another
        expect(condition.permitted).toBe(false);
        isNodeLockedByMe$.next(true);
      } else if (changeCount === 3 ) { // Locked by self
        expect(condition.permitted).toBe(true);
        condition.destroy();
        sub.unsubscribe();
        done();
      }
    });
  });
});
