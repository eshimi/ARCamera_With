import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: true, // Listen on all local IPs
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
});
