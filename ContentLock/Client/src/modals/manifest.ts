import { CONTENTLOCK_LOCKED_MODAL_ALIAS } from "./locked.modal.token";

export const manifests: Array<UmbExtensionManifest> = [
  {
    name: '[Content Lock] Content Locked Modal',
    alias: CONTENTLOCK_LOCKED_MODAL_ALIAS,
    type: 'modal',
    js: () => import('./locked.modal.element'),
  }
];
