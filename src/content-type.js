export function contentType(item){
  let path='';try{path=new URL(item.url).pathname.toLowerCase()}catch{}
  if(/^\/series\//.test(path))return 'series';
  if(/^\/(movie|vod)\//.test(path))return 'film';
  if(/^\/live\//.test(path))return 'live';
  const group=String(item.genre||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  if(/dizi|series|tv\s*shows|serial/.test(group))return 'series';
  if(/film|filim|movie|vod|sinema/.test(group))return 'film';
  if(/\bS\d{1,2}\s*E\d{1,3}\b/i.test(item.title||''))return 'series';
  return item.type||'live';
}
export function normalizeCatalog(items){return items.map(item=>({...item,type:contentType(item)}))}
