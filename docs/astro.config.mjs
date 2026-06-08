// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import catppuccin from "@catppuccin/starlight";
import Icons from 'unplugin-icons/vite'

// https://astro.build/config
export default defineConfig({
	site: 'https://warrenbuckley.github.io/Umbraco.Community.ContentLock',
	base: '/Umbraco.Community.ContentLock',
	integrations: [
		starlight({
			components: {
				SocialIcons: './src/components/SocialIcons.astro',
			Icon: './src/components/Icon.astro',
			},
			plugins: [
				catppuccin({
					dark: { flavor: "mocha", accent: "mauve" },
					light: { flavor: "latte", accent: "mauve" }
				}),
			],
			title: 'Content Lock',
			social: [
				{ icon: 'heart', label: 'Sponsor', href: 'https://github.com/sponsors/warrenbuckley' },
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/warrenbuckley/Umbraco.Community.ContentLock' }
			],
			editLink: { baseUrl: 'https://github.com/warrenbuckley/Umbraco.Community.ContentLock/edit/main/docs/' },
			credits: true,
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
						{ label: 'Auto Lock', slug: 'features/auto-lock' },
						{ label: 'Dashboard', slug: 'features/dashboard' },
						{ label: 'Online Users', slug: 'features/online-users' },
						{ label: 'Audio Calling', slug: 'features/audio-calling', badge: { text: '17.1.0+', variant: 'default'} },
					],
				},
				{
					label: 'Configuration',
					items: [
						{ label: 'Overview', slug: 'configuration/overview' },
						{ label: 'Auto Lock', slug: 'configuration/auto-lock' },
						{ label: 'Online Users', slug: 'configuration/online-users' },
						{ label: 'Audio Calling', slug: 'configuration/audio-calling', badge: { text: '17.1.0+', variant: 'default'} },
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
				{ label: 'Changelog', slug: 'changelog' },
			],
		}),
	],
	vite: {
    	plugins: [Icons({ compiler: 'astro' })],
  	},
});
