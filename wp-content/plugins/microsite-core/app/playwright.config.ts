import { defineConfig } from '@playwright/test';
if (!process.env.WP_SITE_URL) throw new Error('Set WP_SITE_URL to the existing LocalWP home URL.');
export default defineConfig({ testDir: './tests', use: { baseURL: process.env.WP_SITE_URL }, workers: 1 });
