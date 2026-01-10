import { defineConfig } from '@rsbuild/core';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
    html: {
        template: './index.html',
    },
    server: {
        port: 51734
    },
    tools: {
        rspack: {
            module: {
                rules: [
                    {
                        resourceQuery: /url$/,
                        type: 'asset/resource',
                    },
                    {
                        resourceQuery: /raw$/,
                        type: 'asset/source',
                    },
                ],
            },
        },
    },
});
