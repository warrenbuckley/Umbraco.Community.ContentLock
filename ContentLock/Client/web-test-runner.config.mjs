import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from '@web/dev-server-esbuild';

export default {
    files: 'src/**/*.test.ts',
    nodeResolve: {
        exportConditions: ['browser', 'module', 'import', 'default'],
        mainFields: ['browser', 'module', 'main'],
    },
    browsers: [
        playwrightLauncher({
            product: 'chromium',
            launchOptions: {
                executablePath: '/root/.cache/ms-playwright/chromium-1181/chrome-linux/chrome',
            },
        }),
    ],
    plugins: [
        esbuildPlugin({
            ts: true,
            tsconfig: './tsconfig.json',
        }),
    ],
    // Serve mockServiceWorker.js from the root so MSW can register it
    rootDir: '.',
    coverageConfig: {
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/api/**'],
    },
};
