import { autoHideControls } from './player-controls.js';
let disposePlayerControls=null;
import { createSubtitleSelector } from './subtitles.js';
import { contentType, normalizeCatalog } from './content-type.js';
import Hls from 'hls.js';
import { createAudioSelector } from './audio.js';
import { openSettings } from './settings.js';
import { loadConnection } from './provider.js';
import './style.css';

const icons={home:'<path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7"/>',tv:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m8 2 4 3 4-3M8 22h8"/>',film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',series:'<rect x="5" y="7" width="16" height="14" rx="2"/><path d="M17 3H3v14m9-6 5 3-5 3z"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',search:'<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',settings:'<path d="m9 3-1 3-3 1-2 3 2 3v4l4 1 3 3 3-3 4-1v-4l2-3-2-3-3-1-1-3z"/><circle cx="12" cy="12" r="3"/>',play:'<path d="m8 4 13 8-13 8z"/>',plus:'<path d="M12 4v16M4 12h16"/>',arrow:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 5-7 7 7 7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
const icon=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[n]||icons.film}</svg>`;
const img=(path,size='w780')=>`https://image.tmdb.org/t/p/${size}/${path}`;
const catalog=[
{id:'dune',title:'Dune: Çöl Gezegeni',subtitle:'Bölüm İki',year:'2024',genre:'Bilim Kurgu',rating:'8.5',type:'film',image:'8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',poster:'1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',desc:'Kaderin çağrısına kulak ver. Paul Atreides, ailesini yok edenlere karşı intikam yolculuğunda Chani ve Fremenlerle bir araya geliyor.'},
{id:'interstellar',title:'Yıldızlararası',year:'2014',genre:'Bilim Kurgu',rating:'8.7',type:'film',image:'pbrkL804c8yAv3zBZR4QPEafpAR.jpg',poster:'gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'},
{id:'lastofus',title:'The Last of Us',year:'2023',genre:'Drama',rating:'8.7',type:'series',image:'uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',poster:'uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg'},
{id:'oppenheimer',title:'Oppenheimer',year:'2023',genre:'Drama',rating:'8.3',type:'film',image:'fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',poster:'ptpr0kGAckfQkJeJIt8st5dglvd.jpg'},
{id:'batman',title:'The Batman',year:'2022',genre:'Aksiyon',rating:'7.8',type:'film',image:'b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',poster:'74xTEgt7R36Fpooo50r9T25onhq.jpg'},
{id:'stranger',title:'Stranger Things',year:'2022',genre:'Bilim Kurgu',rating:'8.7',type:'series',image:'56v2KjBlU4XaOv9rVYEQypROD7P.jpg',poster:'uOOtwVbSr4QDjAGIifLDwpb2Pdl.jpg'},
{id:'shogun',title:'Shōgun',year:'2024',genre:'Drama',rating:'8.6',type:'series',image:'7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg',poster:'7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg'}];
const channels=[['TRT 1','trt','Gönül Dağı','Ulusal'],['KANAL D','kanal','Arka Sokaklar','Ulusal'],['SHOW','show','Bahar','Ulusal'],['atv','atv','Kim Milyoner Olmak İster?','Ulusal'],['STAR','star','Ömer','Ulusal'],['TV8','tv8','MasterChef Türkiye','Eğlence']].map((c,i)=>({id:'ch'+i,title:c[0],logo:c[1],program:c[2],genre:c[3],type:'live'}));
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
let favorites=read('nova-favorites',[]), history=read('nova-history',[]), imported=normalizeCatalog(read('nova-playlist',[])), connection=null, page='home',filter='Tümü',filterLocked=false,query='',hls=null,lastFocus=null,disposeAudio=null,disposeSubtitles=null,playingItem=null,virtualItems=new Map(),historyTimer=null;
const app=document.querySelector('#app');
const nav=[['home','Ana Sayfa','home'],['live','Canlı TV','tv'],['film','Filmler','film'],['series','Diziler','series'],['favorites','Listem','heart']];
app.innerHTML=`<aside class="sidebar"><a class="brand" href="#" aria-label="NOVA TV ana sayfa">NOVA<span class="brand-tv">TV</span></a><div class="nav-label">KEŞFET</div><nav>${nav.map(([id,label,ico])=>`<button class="nav-item" data-page="${id}">${icon(ico)}<span>${label}</span>${id==='live'?'<i class="live-dot"></i>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-item" data-settings>${icon('settings')}<span>Ayarlar</span></button><div class="device"><span class="device-dot"></span><div>LG webOS TV<small>İzlemenin yeni hali.</small><a class="sponsor-link" href="https://mirascode.com.tr" target="_blank" rel="noopener">mirascode.com.tr</a></div></div></div></aside><main><header><div class="breadcrumb">Keşfet <span>/</span> <strong id="page-name">Ana Sayfa</strong></div><div class="header-right"><button class="search-button" aria-label="Ara">${icon('search')}</button><span class="clock"></span><button class="profile" aria-label="Profil ve ayarlar">E</button></div></header><div id="content"></div><footer><span><b>NOVA</b> TV <span class="footer-divider">|</span> Senin ekranın. Senin dünyan.</span><span class="remote-hint">↑ ↓ ← → Gezin <kbd>OK</kbd> Seç <kbd>↩</kbd> Geri</span></footer></main><div id="overlay" hidden></div><div id="toast" role="status"></div>`;
const content=document.querySelector('#content'),overlay=document.querySelector('#overlay');
function card(item,wide=false,i=0){item={...item,title:escapeHtml(item.title),genre:escapeHtml(item.genre||'Genel'),year:item.year||'',rating:item.rating||'—'};const posterSrc=item.poster?.startsWith('http')?item.poster:item.poster?img(wide?item.image:item.poster,wide?'w780':'w500'):'';const metaLine=item.episodes?.length?`${item.episodes.length} bölüm <b>·</b> ${item.genre}`:`${item.year} <b>·</b> ${item.genre}`;const resumeMeta=item.resumeLabel||((item.type==='series'?'S1 B3 · 28 dk kaldı':'Film · 46 dk kaldı'));const progress=item.progress??[64,32,78][i%3];const resumeAttr=wide&&item.url?` data-resume="${item.id}"`:'';return `<button class="card ${wide?'wide':''}" data-item="${item.id}"${resumeAttr}><div class="card-art">${posterSrc?`<img src="${escapeHtml(posterSrc)}" alt="" loading="lazy">`:`<div class="poster-placeholder">${icon(item.type==='series'?'series':'film')}<span>${item.title}</span></div>`}<span class="quality">${i%2?'HD':'4K'}</span>${wide?`<div class="continue-title">${item.title}</div><span class="resume-play">${icon('play')}</span><div class="progress"><i style="width:${progress}%"></i></div>`:''}</div><div class="card-meta"><h3>${item.title}</h3><span>${wide?resumeMeta:metaLine}<em>${wide?'':`★ ${item.rating}`}</em></span></div></button>`}
function channel(c,i){c={...c,title:escapeHtml(c.title),program:escapeHtml(c.program||''),genre:escapeHtml(c.genre||'Genel')};return `<button class="channel-card" data-item="${c.id}"><div class="channel-visual">${c.poster?`<img src="${escapeHtml(c.poster)}" alt="" loading="lazy">`:''}<div class="channel-visual-shade"></div><div class="channel-top"><span class="channel-logo ${c.logo||'custom'}">${c.title}</span><span class="on-air"><i></i> CANLI</span></div></div><h3>${c.program||c.title}</h3><div class="schedule">${c.program?'20:00 – 23:45':'Yayını aç'}<span>${c.genre||'Canlı TV'}</span></div><div class="channel-progress"><i style="width:${30+i*9}%"></i></div></button>`}
function heading(title,sub,target){return `<div class="section-heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${target?`<button class="see-all" data-page="${target}">Tümünü gör ${icon('arrow')}</button>`:''}</div>`}
function groupSeries(items){
  const groups=new Map();
  for(const item of items){
    if(item.type!=='series'){groups.set(item.id,item);continue}
    const parsed=item.title.match(/^(.*?)(?:[\s._-]*S(\d{1,2})[\s._-]*(?:E|EP|X)(\d{1,3}))(?:[\s._-]*(.*))?$/i);
    const name=(item.seriesName||parsed?.[1]||item.title).trim();
    const season=Number(item.season||parsed?.[2]||0), episode=Number(item.episode||parsed?.[3]||0);
    const key=item.seriesId||`series-${hash(name.toLocaleLowerCase('tr'))}`;
    if(!groups.has(key))groups.set(key,{id:key,title:name,seriesName:name,genre:item.genre,poster:item.poster||'',type:'series',episodes:[]});
    const group=groups.get(key);if(!group.poster&&item.poster)group.poster=item.poster;
    group.episodes.push({...item,season:season||1,episode:episode||group.episodes.length+1,episodeTitle:item.episodeTitle||parsed?.[4]||item.title});
  }
  return [...groups.values()].map(group=>{if(Array.isArray(group.episodes))group.episodes.sort((a,b)=>a.season-b.season||a.episode-b.episode);return group});
}
function findContent(id){const source=imported.length?imported:[...catalog,...channels];return source.find(item=>item.id===id)}
function continueItems(){return history.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(entry=>{const source=findContent(entry.id);if(!source)return null;const progress=entry.duration>0?Math.min(100,Math.round(entry.position/entry.duration*100)):entry.progress||0;return {...source,title:source.seriesName?`${source.seriesName} · ${source.episodeTitle||source.title}`:source.title,progress,resumeLabel:source.seriesName?`S${source.season||1} B${source.episode||1} · devam ediyor`:`${Math.max(1,Math.round((entry.duration-entry.position)/60000))} dk kaldı`}}).filter(Boolean).slice(0,6)}
function rememberProgress(item,position,duration){if(!item||item.type==='live')return;const existing=history.find(entry=>entry.id===item.id),next={id:item.id,position:Number.isFinite(position)?position:existing?.position||0,duration:Number.isFinite(duration)&&duration>0?duration:existing?.duration||0,updatedAt:Date.now()};if(next.duration>0&&next.position/next.duration>.95){history=history.filter(entry=>entry.id!==item.id)}else{history=[next,...history.filter(entry=>entry.id!==item.id)].slice(0,20)}try{localStorage.setItem('nova-history',JSON.stringify(history))}catch{}}
function renderRealHome(){
  const heroItem=imported.find(item=>item.type==='film'||item.type==='series')||imported.find(item=>item.type==='live');
  const heroImage=heroItem?.poster?.startsWith('http')?heroItem.poster:heroItem?.image?.startsWith('http')?heroItem.image:'';
  const resumed=continueItems(),live=imported.filter(item=>item.type==='live').slice(0,6),catalogItems=groupSeries(imported.filter(item=>item.type==='film'||item.type==='series')).slice(0,7);
  const heroImageTag=heroImage?`<img class="hero-bg" src="${escapeHtml(heroImage)}" alt="">`:'';
  const heroYearTag=heroItem?.year?`<span>${escapeHtml(heroItem.year)}</span>`:'';
  const heroAction=heroItem?`<button class="primary" data-item="${heroItem.id}">${icon('play')} Hemen İzle</button>`:`<button class="primary" data-settings>${icon('plus')} Liste Ekle</button>`;
  const resumedHtml=resumed.length?resumed.map((item,i)=>card(item,true,i)).join(''):`<div class="continue-empty">${icon('play')}<div><strong>Henüz yarım kalan bir içerik yok.</strong><span>Bir film veya bölüm açtığında ilerlemen burada görünecek.</span></div></div>`;
  const liveHtml=live.length?live.map(channel).join(''):'<p class="empty-inline">Listenizde canlı kanal bulunmuyor.</p>';
  const catalogHtml=catalogItems.length?catalogItems.map((item,i)=>card(item,false,i)).join(''):'<p class="empty-inline">Listenizde henüz film veya dizi bulunmuyor.</p>';
  content.innerHTML=`<section class="hero real-hero ${heroImage?'':'hero-no-art'}">${heroImageTag}<div class="hero-shade"></div><div class="hero-content"><div class="eyebrow"><span></span> ${heroItem?'LİSTENDEN ÖNE ÇIKAN':'YAYIN LİSTEN HAZIR'}</div><h1>${heroItem?escapeHtml(heroItem.title):'NOVA TV'}<span>${heroItem?escapeHtml(heroItem.genre||'İZLEMEYE BAŞLA'):'KENDİ İÇERİĞİNİ KEŞFET'}</span></h1><div class="hero-meta"><strong>${heroItem?.rating?`★ ${escapeHtml(heroItem.rating)}`:'● HAZIR'}</strong>${heroYearTag}<span>${heroItem?.type==='live'?'CANLI YAYIN':'KİŞİSEL LİSTE'}</span></div><p>${heroItem?'Yayın listenizdeki içerikleri NOVA TV deneyimiyle keşfedin.':'Ayarlar bölümünden M3U veya portal bilgilerinizi ekleyerek izlemeye başlayın.'}</p><div class="hero-actions">${heroAction}</div></div><div class="hero-bottom"><span><i></i> ${heroItem?'SENİN LİSTEN':'NOVA TV'}</span><span class="hero-count">${imported.length} <small>içerik</small></span></div></section><div class="home-body"><section>${heading('Kaldığın Yerden Devam Et','İzlemeye başladıkların burada kalır.')}<div class="continue-grid">${resumedHtml}</div></section><section>${heading('Şimdi Canlı','Favori kanalların, tek bir yerde.','live')}<div class="channel-row">${liveHtml}</div></section><section>${heading('Senin İçeriklerin','M3U listenizdeki film ve diziler.','film')}<div class="poster-grid">${catalogHtml}</div></section></div>`;
}
function render(){document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.querySelector('#page-name').textContent=nav.find(n=>n[0]===page)?.[1]||'Ara';
if(page==='home'){if(imported.length){renderRealHome();bind();return}content.innerHTML=`<section class="hero"><img class="hero-bg" src="${img(catalog[0].image,'original')}" alt="Dune filminin çöl manzarası"><div class="hero-shade"></div><div class="hero-content"><div class="eyebrow"><span></span> HAFTANIN ÖNE ÇIKANI</div><h1>DUNE<span>ÇÖL GEZEGENİ · BÖLÜM İKİ</span></h1><div class="hero-meta"><strong>★ 8.5</strong><span>2024</span><span>2 sa 46 dk</span><span class="outline-tag">16+</span><span class="outline-tag">4K UHD</span></div><p>${catalog[0].desc}</p><div class="hero-actions"><button class="primary" data-item="dune">${icon('play')} Hemen İzle</button><button class="secondary" data-save="dune">${icon(favorites.includes('dune')?'heart':'plus')} ${favorites.includes('dune')?'Listemde':'Listeme Ekle'}</button><button class="round" data-details="dune" aria-label="Film detayları">${icon('info')}</button></div></div><div class="hero-bottom"><span><i></i> SİNEMA EVİNDE</span><div class="hero-dots"><b></b><i></i><i></i><i></i></div><span class="hero-count">01 <small>/ 04</small></span></div></section><div class="home-body"><div class="quick-filters">${['Tümü','Aksiyon','Bilim Kurgu','Drama','Eğlence'].map((f,i)=>`<button class="chip ${i===0?'selected':''}" data-home-filter="${f}">${f==='Tümü'?'✦ ':''}${f}</button>`).join('')}<span class="catalog-status"><i></i> Örnek katalog</span></div><section>${heading('Kaldığın Yerden Devam Et','Güzel hikâyeler yarım kalmasın.')}<div class="continue-grid">${catalog.slice(1,4).map((c,i)=>card(c,true,i)).join('')}</div><p class="demo-note">Örnek izleme geçmişi · Oynatmak için kendi yayın listenizi ekleyin.</p></section><section>${heading('Şimdi Canlı','Favori kanalların, tek bir yerde.','live')}<div class="channel-row">${(imported.filter(c=>c.type==='live').length?imported.filter(c=>c.type==='live'):channels).slice(0,6).map(channel).join('')}</div></section><section>${heading('Bu Akşam Ne İzlesek?','Ekran başına geç, gerisini bize bırak.','film')}<div class="poster-grid" id="recommendations">${catalog.map((c,i)=>card(c,false,i)).join('')}</div></section><div class="connect-banner"><div class="connect-icon">${icon('tv')}</div><div><h3>Bütün eğlencen, tek bir ekranda.</h3><p>IPTV listeni ekle, kendi dünyanı keşfetmeye başla.</p></div><button class="secondary" data-settings>Liste Ekle ${icon('plus')}</button></div></div>`}
else {
  virtualItems.clear();
  const sourceItems=imported.length?imported:[...catalog,...channels];
  const rawItems=page==='live'?sourceItems.filter(c=>c.type==='live'):page==='favorites'?sourceItems.filter(c=>favorites.includes(c.id)):page==='search'?sourceItems:sourceItems.filter(c=>c.type===page);
  const allItems=page==='series'?groupSeries(rawItems):rawItems;
  allItems.forEach(item=>virtualItems.set(item.id,item));
  const m3uCategories=[...new Set(imported.filter(c=>page==='search'||page==='favorites'||c.type===page).map(c=>c.genre).filter(Boolean))];
  const genres=[...new Set(allItems.map(c=>c.genre).filter(Boolean))];
  const defaultCategory=m3uCategories[0]||'Tümü';
  if(!filter||(!filterLocked&&filter==='Tümü'&&m3uCategories.length))filter=defaultCategory;
  if(filter!=='Tümü'&&!genres.includes(filter))filter=defaultCategory;
  let items=allItems.filter(c=>(filter==='Tümü'||c.genre===filter)&&(!query||c.title.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))));
  const visibleItems=items.slice(0,300);
  const options=[...new Set([...(m3uCategories.length?m3uCategories:[]),...genres.filter(g=>!m3uCategories.includes(g)),'Tümü'])];
  content.innerHTML=`<div class="library"><div class="content-types" role="group" aria-label="İçerik türü">${[['live','Canlı TV'],['film','Filmler'],['series','Diziler']].map(([type,label])=>`<button data-page="${type}" aria-label="${label} içerikleri" aria-pressed="${page===type}" class="content-type ${page===type?'selected':''}">${label}</button>`).join('')}</div><div class="eyebrow">SENİN DÜNYAN</div><h1>${page==='search'?'Ne izlemek istersin?':nav.find(n=>n[0]===page)?.[1]}</h1><p class="library-sub">${page==='live'?'Ekranların en sevilenleri, şimdi canlı.':page==='favorites'?'Sevdiğin hikâyeleri bir arada tut.':'Yeni bir hikâyeye yer aç.'}</p><label class="search-field">${icon('search')}<input id="search" placeholder="Film, dizi veya kanal ara…" value="${escapeHtml(query)}" aria-label="Katalogda ara"></label><div class="category-toolbar"><label for="category-select">Kategori</label><select id="category-select" aria-label="Kategori seç">${options.map(category=>`<option value="${escapeHtml(category)}" ${filter===category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select><span class="catalog-status">${items.length} içerik${items.length>visibleItems.length?' · ilk 300 gösteriliyor':''}</span></div><div class="${page==='live'?'live-grid':'poster-grid library-grid'}">${visibleItems.map((c,i)=>c.type==='live'?channel(c,i):card(c,false,i)).join('')}</div>${!items.length?`<div class="empty">${icon(page==='favorites'?'heart':'search')}<h2>${page==='favorites'?'Listen seni bekliyor':'Sonuç bulunamadı'}</h2><p>${page==='favorites'?'İçerik detaylarındaki “Listeme Ekle” düğmesiyle favorilerini kaydet.':'Farklı bir arama veya kategori dene.'}</p><button class="primary" data-page="home">Ana Sayfaya Dön</button></div>`:''}</div>`}bind();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function go(p){page=p;filter='Tümü';filterLocked=false;query='';render();window.scrollTo(0,0)}
function bind(){document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>go(b.dataset.page));document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const item=virtualItems.get(b.dataset.item)||findContent(b.dataset.item);if(item?.url)play(item,{fullscreen:true});else details(b.dataset.item)});document.querySelectorAll('[data-resume]').forEach(b=>b.onclick=()=>{const item=findContent(b.dataset.resume);if(item?.url)play(item,{fullscreen:true})});document.querySelectorAll('[data-details]').forEach(b=>b.onclick=()=>details(b.dataset.details));document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>save(b.dataset.save,b));document.querySelectorAll('[data-settings]').forEach(b=>b.onclick=settings);const category=document.querySelector('#category-select');if(category)category.onchange=()=>{filterLocked=true;filter=category.value;render();document.querySelector('#category-select')?.focus()};document.querySelectorAll('[data-home-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-home-filter]').forEach(x=>x.classList.toggle('selected',x===b));const list=catalog.filter(c=>b.dataset.homeFilter==='Tümü'||c.genre===b.dataset.homeFilter);document.querySelector('#recommendations').innerHTML=list.length?list.map((c,i)=>card(c,false,i)).join(''):'<p class="empty-inline">Bu kategoride henüz içerik yok. Kendi listenizi ayarlardan ekleyebilirsiniz.</p>';bind()});const search=document.querySelector('#search');if(search)search.oninput=()=>{const pos=search.selectionStart;query=search.value;render();const next=document.querySelector('#search');next.focus();next.setSelectionRange(pos,pos)}}
function toast(msg){const el=document.querySelector('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3500)}
function save(id,b){favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];try{localStorage.setItem('nova-favorites',JSON.stringify(favorites))}catch{toast('Bu cihazda liste kaydedilemedi.')}if(b)b.innerHTML=`${icon(favorites.includes(id)?'heart':'plus')} ${favorites.includes(id)?'Listemde':'Listeme Ekle'}`;toast(favorites.includes(id)?'Listene eklendi':'Listenden kaldırıldı')}
function modal(html){lastFocus=document.activeElement;overlay.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="İçerik penceresi">${html}</div>`;overlay.hidden=false;document.body.style.overflow='hidden';queueMicrotask(()=>{const root=overlay.querySelector('.modal');if(!root)return;const target=root.querySelector('#toggle-play,#season-select,#watch')||root.querySelector('[data-mode].selected')||focusable(root)[0];target?.focus()})}
function close(){disposePlayerControls?.();disposePlayerControls=null;if(disposeAudio){disposeAudio();disposeAudio=null}if(disposeSubtitles){disposeSubtitles();disposeSubtitles=null}if(hls){hls.destroy();hls=null}clearTimeout(historyTimer);historyTimer=null;try{if(document.fullscreenElement||document.webkitFullscreenElement)(document.exitFullscreen||document.webkitExitFullscreen)?.call(document)}catch{}const v=overlay.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}overlay.hidden=true;overlay.innerHTML='';document.body.style.overflow='';if(page==='favorites'||(page==='home'&&imported.length))render();lastFocus?.focus()}
function seriesDetails(series){
  const detailImage=series.image?img(series.image):series.poster?.startsWith('http')?series.poster:'';
  const seasons=[...new Set(series.episodes.map(ep=>ep.season||1))].sort((a,b)=>a-b);
  modal(`${detailImage?`<img class="detail-image" src="${escapeHtml(detailImage)}" alt="">`:''}<div class="modal-body series-modal-body"><div class="eyebrow">DİZİ · ${series.episodes.length||0} BÖLÜM</div><h2>${escapeHtml(series.title)}</h2><p>${escapeHtml(series.desc||`${series.genre||'Dizi'} · Tüm sezonlar ve bölümler`)}</p>${seasons.length?`<label class="season-picker">Sezon <select id="season-select" aria-label="Sezon seç">${seasons.map(season=>`<option value="${season}">Sezon ${season}</option>`).join('')}</select></label><div id="episode-list" class="episode-list"></div>`:'<p class="notice">Bu dizinin bölüm bilgisi yayın listesinde bulunamadı. Sezonları bir arada görmek için sağlayıcınızın dizi kategorisini kullanın.</p>'}<button class="secondary" id="favorite">${icon('heart')} ${favorites.includes(series.id)?'Listemde':'Listeme Ekle'}</button></div>`);
  document.querySelector('#favorite').onclick=e=>save(series.id,e.currentTarget);
  const picker=document.querySelector('#season-select'),list=document.querySelector('#episode-list');
  if(!picker||!list)return;
  const drawEpisodes=()=>{const season=Number(picker.value);list.innerHTML=series.episodes.filter(ep=>(ep.season||1)===season).map((ep,index)=>`<button class="episode-row" data-episode-id="${ep.id}"><span class="episode-number">${String(ep.episode||index+1).padStart(2,'0')}</span><span class="episode-copy"><strong>${escapeHtml(ep.episodeTitle||ep.title)}</strong><small>${escapeHtml(ep.genre||'Dizi')} · Bölüm ${ep.episode||index+1}</small></span><span class="episode-play">${icon('play')}</span></button>`).join('')||'<p class="notice">Bu sezonda bölüm bulunamadı.</p>';list.querySelectorAll('[data-episode-id]').forEach(button=>button.onclick=()=>{const episode=series.episodes.find(ep=>ep.id===button.dataset.episodeId);if(episode)play(episode,{fullscreen:true})})};
  picker.onchange=drawEpisodes;drawEpisodes();
}
function details(id){const c=virtualItems.get(id)||findContent(id);if(!c)return;if(c.type==='series'&&Array.isArray(c.episodes)){seriesDetails(c);return}const detailImage=c.image?img(c.image):c.poster?.startsWith('http')?c.poster:'';modal(`${detailImage?`<img class="detail-image" src="${escapeHtml(detailImage)}" alt="">`:''}<div class="modal-body"><div class="eyebrow">${c.type==='live'?'CANLI TV':c.type==='series'?'DİZİ':'FİLM'}</div><h2>${escapeHtml(c.title)}</h2><p>${escapeHtml(c.desc||`${c.genre||'Genel'} ${c.year?'· '+c.year:''}`)}</p>${!c.url?'<p class="notice">Bu içerik örnek katalogdadır. İzlemek için yayın hakkına sahip olduğunuz M3U listenizi ayarlardan ekleyin.</p>':''}<div class="hero-actions"><button class="primary" id="watch">${icon(c.url?'play':'plus')} ${c.url?'Yayını Başlat':'Yayın Listesi Ekle'}</button><button class="secondary" id="favorite">${icon('heart')} ${favorites.includes(id)?'Listemde':'Listeme Ekle'}</button></div></div>`);document.querySelector('#watch').onclick=()=>c.url?play(c,{fullscreen:true}):settings();document.querySelector('#favorite').onclick=e=>save(id,e.currentTarget)}
function enterPlayerFullscreen(){
  const player=overlay.querySelector('.player-modal');player.classList.add('expanded');
  const request=player.requestFullscreen||player.webkitRequestFullscreen;
  try{Promise.resolve(request?.call(player)).catch(()=>{})}catch{}
}
function setPlayerSource(c,v,status){
  playingItem=c;
  if(disposeAudio){disposeAudio();disposeAudio=null}if(disposeSubtitles){disposeSubtitles();disposeSubtitles=null}
  if(hls){hls.destroy();hls=null}
  v.pause();v.removeAttribute('src');v.load();status.textContent='Yayın yükleniyor…';
  const useHls=/\.m3u8(?:\?|$)/i.test(c.url)&&!v.canPlayType('application/vnd.apple.mpegurl')&&Hls.isSupported();
  if(useHls){
    hls=new Hls();
    disposeAudio=createAudioSelector({video:v,hls,events:Hls.Events,container:document.querySelector('#audio-selector')});
    hls.on(Hls.Events.ERROR,(_,d)=>{if(d.fatal)status.textContent='HLS yayını açılamadı. Yayın adresi veya CORS erişimi uygun olmayabilir.'});
    hls.loadSource(c.url);hls.attachMedia(v);
  }else{
    disposeAudio=createAudioSelector({video:v,container:document.querySelector('#audio-selector')});
    v.src=c.url;
  }
  disposeSubtitles=createSubtitleSelector({video:v,hls,events:Hls.Events,container:document.querySelector('#subtitle-selector')});
  v.play().catch(()=>status.textContent='Yayını başlatmak için oynat düğmesine basın.');
}
function play(c,{fullscreen=false}={}){
  disposePlayerControls?.();disposePlayerControls=null;
  modal(`<div class="modal-body player-body"><h2>${escapeHtml(c.title)}</h2><video controls autoplay playsinline tabindex="-1"></video><div class="player-toolbar"><button class="secondary" id="toggle-play">Oynat / Duraklat</button><button class="secondary" id="expand-player">Ekranı Büyüt</button></div><button class="secondary" id="language-menu" aria-expanded="false">Ses / Altyazı</button><div id="language-panel" hidden><div id="audio-selector" class="audio-selector"></div><div id="subtitle-selector" class="audio-selector"></div></div><p id="player-status" role="status">Yayın yükleniyor…</p></div>`);
  overlay.querySelector('.modal').classList.add('player-modal');
  const v=overlay.querySelector('video'),status=overlay.querySelector('#player-status');
  if(fullscreen)enterPlayerFullscreen();
  document.querySelector('#language-menu').onclick=()=>{const panel=document.querySelector('#language-panel');panel.hidden=!panel.hidden;document.querySelector('#language-menu').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)focusable(panel)[0]?.focus()};
  v.onplaying=()=>status.textContent='';
  v.onerror=()=>status.textContent='Yayın açılamadı. Adresi, bağlantıyı ve cihazın codec desteğini kontrol edin.';
  const saved=history.find(entry=>entry.id===c.id);
  v.addEventListener('loadedmetadata',()=>{if(saved?.position&&saved.position<v.duration-10){try{v.currentTime=saved.position}catch{}}});
  v.addEventListener('timeupdate',()=>{if(!Number.isFinite(v.duration)||v.duration<=0)return;clearTimeout(historyTimer);historyTimer=setTimeout(()=>rememberProgress(c,v.currentTime,v.duration),1200)});
  document.querySelector('#toggle-play').onclick=()=>{if(v.paused)v.play().catch(()=>status.textContent='Yayın başlatılamadı.');else v.pause()};
  document.querySelector('#expand-player').onclick=e=>{const expanded=overlay.querySelector('.modal').classList.toggle('expanded');e.currentTarget.textContent=expanded?'Küçült':'Ekranı Büyüt'};
  setPlayerSource(c,v,status);
  disposePlayerControls=autoHideControls(overlay.querySelector('.player-modal'),v);
}
function liveItems(){return imported.filter(item=>item.type==='live'&&item.url)}
function switchLiveChannel(direction){
  const list=liveItems();
  if(!list.length){toast('Kanal listesi eklemek için Ayarlar’ı açın.');return}
  const index=list.findIndex(item=>item.id===playingItem?.id);
  if(index<0){toast('Kanal değiştirmek için önce bir canlı yayın açın.');return}
  const next=list[(index+direction+list.length)%list.length];
  const video=overlay.querySelector('video'),status=overlay.querySelector('#player-status');
  if(video&&!overlay.hidden&&status){
    overlay.querySelector('.player-body h2').textContent=next.title;
    setPlayerSource(next,video,status);
  }else play(next,{fullscreen:true});
  toast(next.title);
}
function adjustVolume(direction){
  const service=window.webOS?.service?.request;
  if(service){
    try{window.webOS.service.request('luna://com.webos.audio',{method:direction>0?'volumeUp':'volumeDown',parameters:{},onFailure:()=>{}});return true}catch{}
  }
  const video=overlay.querySelector('video');
  if(video){video.volume=Math.max(0,Math.min(1,video.volume+direction*.05));toast(`Ses %${Math.round(video.volume*100)}`);return true}
  return false;
}
function legacySettings(){modal(`<div class="modal-body settings"><h2>Yayın listeni bağla</h2></div>`)}
function settings(){
  const saveImported=(next,done)=>{connection=next;imported=normalizeCatalog(next.items||[]);try{localStorage.setItem('nova-playlist',JSON.stringify(imported))}catch{};if(done){close();go('live');toast(imported.length+' içerik eklendi')}};
  saveImported.parse=parseM3U;
  openSettings({modal,overlay,connection,onSaved:saveImported,escapeHtml});
}
export function parseM3U(text){let meta=null;return text.replace(/^\uFEFF/,'').split(/\r?\n/).reduce((all,line)=>{line=line.trim();if(line.startsWith('#EXTINF:')){const match=line.match(/,(?![^\"]*\"(?:[^\"]*\"[^\"]*\")*[^\"]*$)(.*)$/);meta={title:match?.[1]?.trim()||line.slice(line.lastIndexOf(',')+1)||'İsimsiz kanal',genre:line.match(/group-title="([^"]*)"/i)?.[1]||'Genel',poster:line.match(/(?:tvg-logo|logo)="([^"]+)"/i)?.[1]||'',seriesName:line.match(/(?:series-name|series|show-title)="([^"]+)"/i)?.[1]||'',season:Number(line.match(/(?:season|season-num|season_number)="?(\d+)/i)?.[1]||0),episode:Number(line.match(/(?:episode|episode-num|episode_number)="?(\d+)/i)?.[1]||0)}}else if(/^https?:\/\//i.test(line)){try{const url=new URL(line),rawTitle=meta?.title||'Yayın '+(all.length+1),pattern=rawTitle.match(/^(.*?)(?:[\s._-]*S(\d{1,2})[\s._-]*(?:E|EP|X)(\d{1,3}))(?:[\s._-]*(.*))?$/i),type=contentType({url:url.href,genre:meta?.genre,title:rawTitle}),seriesName=meta?.seriesName||pattern?.[1]?.trim()||rawTitle;all.push({id:'m3u-'+hash(url.href),title:rawTitle,seriesName,seriesId:type==='series'?`series-${hash(seriesName.toLocaleLowerCase('tr'))}`:undefined,episodeTitle:pattern?.[4]?.trim()||rawTitle,season:meta?.season||Number(pattern?.[2]||0),episode:meta?.episode||Number(pattern?.[3]||0),genre:meta?.genre||'Genel',type,url:url.href,poster:meta?.poster||''});meta=null}catch{}}return all},[])}
function focusable(root){return [...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')}
// Route the remote wheel to the nearest scrollable panel, including when the pointer is over the backdrop.
document.addEventListener('wheel',event=>{
  if(event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
  if(event.target.closest?.('select'))return;
  const panel=overlay.hidden?null:overlay.querySelector('.modal');
  let target=event.target instanceof Element?event.target:null;
  const delta=event.deltaY*(event.deltaMode===1?32:event.deltaMode===2?window.innerHeight:1);
  while(target&&target!==document.body){
    const overflow=getComputedStyle(target).overflowY;
    if(/auto|scroll/.test(overflow)&&target.scrollHeight>target.clientHeight+1){
      if((delta>0&&target.scrollTop+target.clientHeight<target.scrollHeight-1)||(delta<0&&target.scrollTop>0))break;
    }
    target=target.parentElement;
  }
  const scroller=target&&target!==document.body?target:panel||document.scrollingElement;
  if(scroller&&delta){event.preventDefault();scroller.scrollTop+=delta}
},{passive:false});
function hash(s){let n=0;for(let i=0;i<s.length;i++)n=((n<<5)-n+s.charCodeAt(i))|0;return (n>>>0).toString(36)}
document.querySelector('.brand').onclick=e=>{e.preventDefault();go('home')};document.querySelector('.search-button').onclick=()=>{go('search');document.querySelector('#search').focus()};document.querySelector('.profile').onclick=settings;
overlay.onclick=e=>{if(e.target===overlay)close()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'||e.keyCode===461){e.preventDefault();if(!overlay.hidden){const panel=overlay.querySelector('#language-panel');if(panel&&!panel.hidden){panel.hidden=true;overlay.querySelector('#language-menu').setAttribute('aria-expanded','false');overlay.querySelector('#language-menu').focus()}else close();}else if(page!=='home')go('home');else modal('<div class="modal-body"><h2>İzlemeye ara ver?</h2><p>Uygulamadan çıkmak istiyor musun?</p><button class="primary" id="exit">Çıkış Yap</button></div>');const exit=document.querySelector('#exit');if(exit)exit.onclick=()=>window.close();return}
const volumeUp=e.key==='AudioVolumeUp'||e.key==='VolumeUp'||e.keyCode===175,volumeDown=e.key==='AudioVolumeDown'||e.key==='VolumeDown'||e.keyCode===174;if(volumeUp||volumeDown){if(adjustVolume(volumeUp?1:-1))e.preventDefault();return}
const channelUp=e.key==='PageUp'||e.key==='ChannelUp'||e.keyCode===33,channelDown=e.key==='PageDown'||e.key==='ChannelDown'||e.keyCode===34;if(channelUp||channelDown){e.preventDefault();if(!overlay.hidden&&playingItem?.type==='live')switchLiveChannel(channelUp?1:-1);else window.scrollBy({top:(channelUp?-1:1)*Math.max(240,window.innerHeight*.75),behavior:'smooth'});return}
const v=overlay.querySelector('video');if(v&&[415,19,413].includes(e.keyCode)){e.preventDefault();if(e.keyCode===415)v.play().catch(()=>{});else v.pause();return}if(e.key==='Tab'&&!overlay.hidden){const els=focusable(overlay);if(!els.length)return;if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus()}else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus()}return}if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||document.activeElement.tagName==='INPUT'||document.activeElement.tagName==='VIDEO'||document.activeElement.tagName==='SELECT')return;e.preventDefault();const root=overlay.hidden?document:overlay;const els=focusable(root);const current=document.activeElement;if(!els.includes(current)){els[0]?.focus();return}const r=current.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2;let best=null,score=Infinity;els.forEach(x=>{if(x===current)return;const t=x.getBoundingClientRect(),dx=t.x+t.width/2-cx,dy=t.y+t.height/2-cy;const horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight';const primary=horizontal?dx:dy,secondary=horizontal?dy:dx;const sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;if(primary*sign<=5)return;const s=Math.abs(primary)+Math.abs(secondary)*3;if(s<score){score=s;best=x}});best?.focus();best?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})});
function updateClock(){document.querySelector('.clock').textContent=new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}updateClock();setInterval(updateClock,30000);render();
loadConnection().then(saved=>{if(saved){connection=saved;if(Array.isArray(saved.items)){imported=normalizeCatalog(saved.items);render()}}}).catch(()=>{});
