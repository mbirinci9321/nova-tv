import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://localhost:5173/');
  const items=[
    {id:'a',title:'Dark S01E01 Başlangıç',seriesName:'Dark',seriesId:'series-dark',episodeTitle:'Başlangıç',season:1,episode:1,genre:'Diziler',type:'series',url:'https://example.com/a',poster:'https://example.com/a.jpg'},
    {id:'b',title:'Dark S01E02 Sırlar',seriesName:'Dark',seriesId:'series-dark',episodeTitle:'Sırlar',season:1,episode:2,genre:'Diziler',type:'series',url:'https://example.com/b',poster:'https://example.com/a.jpg'},
    {id:'c',title:'Dark S02E01 Yeni Dünya',seriesName:'Dark',seriesId:'series-dark',episodeTitle:'Yeni Dünya',season:2,episode:1,genre:'Diziler',type:'series',url:'https://example.com/c',poster:'https://example.com/a.jpg'}
  ];
  await page.evaluate(value=>localStorage.setItem('nova-playlist',JSON.stringify(value)),items);
  await page.reload();
  await page.getByRole('button',{name:'Diziler',exact:true}).click();
  assert.equal(await page.locator('.library-grid .card').count(),1);
  await page.locator('.library-grid .card').first().click();
  assert.deepEqual(await page.locator('#season-select option').allTextContents(),['Sezon 1','Sezon 2']);
  assert.equal(await page.locator('.episode-row').count(),2);
  await page.locator('#season-select').selectOption('2');
  assert.equal(await page.locator('.episode-row').count(),1);
  console.log('PASS: all series episodes grouped into one card with season and episode selection.');
}finally{await browser.close()}
