import { chromium } from '@playwright/test';
import fs from 'node:fs';
const svg=fs.readFileSync('public/nova-icon.svg','utf8');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});const sized=svg.replace('<svg ','<svg width="512" height="512" ');await page.setContent(`<body style="margin:0;width:512px;height:512px;overflow:hidden">${sized}</body>`);await page.screenshot({path:'public/icon.png',omitBackground:false});}finally{await browser.close()}
