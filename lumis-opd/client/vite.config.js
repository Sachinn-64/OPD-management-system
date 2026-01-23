import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
/* eslint-disable no-undef */
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@pages': path.resolve(__dirname, './src/pages'),
            '@layouts': path.resolve(__dirname, './src/layouts'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@services': path.resolve(__dirname, './src/services'),
            '@store': path.resolve(__dirname, './src/store'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@types': path.resolve(__dirname, './src/types'),
            '@styles': path.resolve(__dirname, './src/styles'),
            '@assets': path.resolve(__dirname, './src/assets'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://lumis-r20v.onrender.com',
                changeOrigin: true,
            },
        },
    },
});
