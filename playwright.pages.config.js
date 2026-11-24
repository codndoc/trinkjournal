import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./pages-tests',workers:1,timeout:30000,reporter:'list',use:{baseURL:'http://127.0.0.1:4173/trinkjournal/',channel:'msedge',headless:true},webServer:{command:'node preview.mjs /trinkjournal/',url:'http://127.0.0.1:4173/trinkjournal/',reuseExistingServer:false}});
