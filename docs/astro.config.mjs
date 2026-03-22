// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'ContentLock Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/warrenbuckley/Umbraco.Community.ContentLock' }],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Quick Start', slug: 'getting-started/quick-start' },
					],
				},
				{
					label: 'Features',
					items: [
						{ label: 'Content Locking', slug: 'features/content-locking' },
						{ label: 'Dashboard', slug: 'features/dashboard' },
						{ label: 'Online Users', slug: 'features/online-users' },
						{ label: 'Audio Calling', slug: 'features/audio-calling' },
					],
				},
				{
					label: 'Configuration',
					items: [
						{ label: 'Overview', slug: 'configuration/overview' },
						{ label: 'Online Users', slug: 'configuration/online-users' },
						{ label: 'WebRTC / Audio Calling', slug: 'configuration/webrtc' },
					],
				},
				{
					label: 'Permissions',
					items: [{ label: 'Unlocker Permission', slug: 'permissions' }],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
