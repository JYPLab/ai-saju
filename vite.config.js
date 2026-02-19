import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
        alias: {
            '@modules': resolve(__dirname, 'src/modules'),
            '@utils': resolve(__dirname, 'src/utils'),
            '@styles': resolve(__dirname, 'src/styles'),
        },
    },
    build: {
        target: 'es2020',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                report: resolve(__dirname, 'report.html'),
            },
            output: {
                manualChunks: {
                    manseryeok: ['@gracefullight/saju', 'korean-lunar-calendar'],
                    pdf: ['jspdf', 'html2canvas'],
                },
            },
        },
    },
    optimizeDeps: {
        include: ['@gracefullight/saju', 'korean-lunar-calendar'],
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
        server: {
            deps: {
                inline: ['@gracefullight/saju'],
            },
        },
    },
});
