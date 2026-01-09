import { defineConfig } from '@rsbuild/core';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
    html: {
        template: './index.html',
    },
    server: {
        port: 51734
    }
});
