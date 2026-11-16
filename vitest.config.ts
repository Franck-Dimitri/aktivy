import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Tests du front (npm test). Configuration à part de vite.config.ts : les extensions Laravel,
 * Wayfinder et Tailwind ne servent pas aux tests et demanderaient PHP pour démarrer.
 *
 * Windows : lancer depuis PowerShell ou l'invite de commandes. Depuis Git Bash (chemin « d:\… »
 * en minuscule), Vitest charge deux copies de lui-même et aucun test ne démarre.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        include: [
            'resources/js/**/*.test.{ts,tsx}',
            'tests/js/**/*.test.{ts,tsx}',
        ],
        // window, document, localStorage, navigator : comme dans le navigateur du téléphone
        environment: 'jsdom',
        restoreMocks: true,
        unstubGlobals: true,
    },
});
