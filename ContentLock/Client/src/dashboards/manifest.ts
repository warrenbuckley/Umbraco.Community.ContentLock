export const manifests: Array<UmbExtensionManifest> = [
  {
    name: '[Content Lock] Overview Dashboard',
    alias: 'ContentLock.Dashboard',
    type: 'dashboard',
    weight: 19, // 20 is default Umbraco News/promo dashboard
    js: () => import('./dashboard.element'),
    meta: {
      label: 'Content Locks',
      pathname: 'content-locks'
    },
    conditions: [
      {
        alias: 'Umb.Condition.SectionAlias', // Only allow dashboard in Content Section/App
        match: 'Umb.Section.Content', //TODO: Is there a CONST we can use?
      }
    ],
  }
];
