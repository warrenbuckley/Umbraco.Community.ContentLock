import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Shared MSW service worker used across all browser-based tests */
export const worker = setupWorker(...handlers);
