import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();
 await page.goto('http://localhost:5173');
 const result=await page.evaluate(async()=>{
   const {createAudioSelector,trackLabel}=await import('/src/audio.js');
   const check=(value,message)=>{if(!value)throw Error(message)};
   const container=document.createElement('div');document.body.append(container);
   const store=new Map(),storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
   const video=new EventTarget();video.readyState=1;
   const native=new EventTarget();native.length=2;
   native[0]={language:'eng',label:'Original',enabled:true};native[1]={language:'tur',label:'Dublaj',enabled:false};video.audioTracks=native;
   const dispose=createAudioSelector({video,container,storage});
   container.querySelectorAll('button')[1].click();
   check(native[1].enabled&&!native[0].enabled,'Native audio selection failed');
   check(container.querySelectorAll('button')[1].getAttribute('aria-pressed')==='true','Native selection UI failed');
   check(store.get('mbirinci-audio-language')==='Türkçe','Language preference failed');
   native[1].enabled=false;native[0].enabled=true;native.dispatchEvent(new Event('change'));
   check(container.querySelectorAll('button')[0].getAttribute('aria-pressed')==='true','Native external change failed');
   dispose();
   const handlers=new Map();let current=0;
   const hls={audioTracks:[{lang:'en',name:'Original'},{lang:'tr',name:'Türkçe'}],get audioTrack(){return current},set audioTrack(value){current=value},on:(event,fn)=>handlers.set(event,fn),off:event=>handlers.delete(event)};
   const events={AUDIO_TRACKS_UPDATED:'updated',AUDIO_TRACK_SWITCHED:'switched'};
   const cleanup=createAudioSelector({video,hls,events,container,storage});
   check(current===1,'Saved language not applied to HLS');
   container.querySelectorAll('button')[0].focus();container.querySelectorAll('button')[0].click();
   check(current===0,'HLS audio setter failed');
   check(document.activeElement.dataset.audioIndex==='0','Focus lost during selection');
   hls.audioTracks=[{lang:'en',name:'Original'}];handlers.get('updated')();
   check(container.textContent.includes('tek ses'),'Single-track state failed');
   hls.audioTracks=[];handlers.get('updated')();check(container.textContent.includes('bildirmiyor'),'No-track state failed');
   cleanup();check(handlers.size===0,'HLS listener cleanup failed');
   check(trackLabel({language:'und'},0)==='und','Unknown language should not be invented');
   return 'Native + HLS adapters: selection, persistence, external updates, focus, one/no-track states, cleanup passed';
 });
 console.log(result);
 // Confirm the exact TV build opens from disk without module/CORS dependencies.
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve('dist-webos/index.html')).href);
 await page.getByRole('button',{name:'Filmler',exact:true}).click();
 assert(await page.locator('.library-grid .card').count()>0);
 assert.deepEqual(errors,[]);
 console.log('Packaged classic-script build opens via file://; navigation passed.');
}finally{await browser.close()}
