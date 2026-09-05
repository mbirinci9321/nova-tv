export function portalCredentials(value,username,password){
  let url;try{url=new URL(value)}catch{throw Error('Geçerli bir http:// veya https:// adresi girin.')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('HTTP veya HTTPS portal adresi kullanın.');
  const user=username??url.searchParams.get('username'),pass=password??url.searchParams.get('password');
  if(!user||!pass)return null;
  const base=new URL(url.href);base.search='';base.hash='';
  base.pathname=base.pathname.replace(/\/(get|player_api)\.php$/i,'').replace(/\/$/,'')+'/';
  return {base:base.href,username:user,password:pass};
}
export function providerUrl(credentials,endpoint){
  const url=new URL(endpoint,credentials.base);url.searchParams.set('username',credentials.username);url.searchParams.set('password',credentials.password);
  if(endpoint==='get.php'){url.searchParams.set('type','m3u_plus');url.searchParams.set('output','m3u8')}
  return url.href;
}
export async function request(url,{signal,json=false}={}){
  const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel);
  if(signal?.aborted)controller.abort();
  // TV playlists can be tens of megabytes; give slower Wi‑Fi connections room to finish.
  const timeout=setTimeout(cancel,180000);
  const candidates=[url];try{const secure=new URL(url);if(secure.protocol==='http:'){secure.protocol='https:';if(secure.port==='80')secure.port='';const alternate=secure.href;if(alternate!==url)candidates.push(alternate)}}catch{}
  let lastError=null;
  try{for(const candidate of candidates){try{const response=await fetch(candidate,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Sunucu yanıtı: '+response.status);return await (json?response.json():response.text())}catch(error){if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');if(error.name==='AbortError')throw Error('Sunucu yanıtı zaman aşımına uğradı.');lastError=error}}throw lastError||Error('İstek başarısız oldu.');}
  catch(error){if(signal?.aborted)throw new DOMException('İptal edildi','AbortError');if(error.name==='AbortError')throw Error('Sunucu yanıtı zaman aşımına uğradı.');throw Error('Sunucuya erişilemedi. Adresi, bağlantıyı ve sunucunun CORS iznini kontrol edin. HTTP başarısızsa HTTPS adresini deneyin.')}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel)}
}
export async function accountInfo(credentials,signal){
  const data=await request(providerUrl(credentials,'player_api.php'),{signal,json:true});
  const info=data?.user_info;if(!info)throw Error('Sağlayıcı hesap bilgisi bildirmedi.');
  if(String(info.auth)!=='1')throw Error('Kullanıcı adı veya şifre doğrulanamadı.');
  const raw=info.exp_date;
  const expiry=raw===null||raw==='0'||raw===0?'unlimited':Number(raw)>0?Number(raw)*1000:null;
  return {status:String(info.status||'Bilinmiyor'),expiry,checkedAt:Date.now()};
}
export function expiryLabel(account){
  if(!account)return 'Sağlayıcıdan alınamadı';
  if(account.expiry==='unlimited')return 'Süresiz';
  if(!Number.isFinite(account.expiry)||account.expiry<=0)return 'Sağlayıcı bildirmedi';
  return new Date(account.expiry).toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
}
const db=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('nova-tv',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('data'))r.result.createObjectStore('data');if(!r.result.objectStoreNames.contains('items'))r.result.createObjectStore('items',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
export async function saveConnection(connection){
  const items=Array.isArray(connection.items)?connection.items:[],metadata={...connection};delete metadata.items;metadata.itemCount=items.length;
  const database=await db();try{await new Promise((resolve,reject)=>{const tx=database.transaction(['data','items'],'readwrite');tx.objectStore('data').put(metadata,'connection');const store=tx.objectStore('items');store.clear();const chunkSize=200;for(let i=0;i<items.length;i+=chunkSize)store.put({id:i/chunkSize,items:items.slice(i,i+chunkSize)});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{database.close()}
  // Preserve a small legacy cache while large catalogs live in IndexedDB.
  try{const text=JSON.stringify(connection.items);if(text.length<1000000)localStorage.setItem('nova-playlist',text);else localStorage.removeItem('nova-playlist')}catch{}
}
export async function loadConnection(){const database=await db();try{return await new Promise((resolve,reject)=>{const tx=database.transaction(['data','items'],'readonly'),r=tx.objectStore('data').get('connection');r.onsuccess=()=>{const metadata=r.result;if(!metadata){resolve(null);return}if(Array.isArray(metadata.items)){resolve(metadata);return}const all=tx.objectStore('items').getAll();all.onsuccess=()=>{metadata.items=all.result.sort((a,b)=>a.id-b.id).flatMap(chunk=>chunk.items||[]);resolve(metadata)};all.onerror=()=>reject(all.error)};r.onerror=()=>reject(r.error)})}finally{database.close()}}
