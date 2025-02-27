export const manifests: Array<UmbExtensionManifest> = [
  {
    name: "Content Lock Entrypoint",
    alias: "ContentLock.Entrypoint",
    type: "backofficeEntryPoint",
    js: () => import("./entrypoint"),
  }
];
