// Both adapters expose actual source tracks; no languages are invented.
const languages = {tr:'Türkçe',tur:'Türkçe',en:'İngilizce',eng:'İngilizce',de:'Almanca',deu:'Almanca',ger:'Almanca',fr:'Fransızca',fra:'Fransızca',fre:'Fransızca',es:'İspanyolca',spa:'İspanyolca',it:'İtalyanca',ita:'İtalyanca',ja:'Japonca',jpn:'Japonca',ko:'Korece',kor:'Korece',ar:'Arapça',ara:'Arapça',ru:'Rusça',rus:'Rusça'};
export function languageKey(value='') {
  const code=value.toLowerCase().split('-')[0];
  return languages[code] || code;
}
export function trackLabel(track,index) {
  const lang=languageKey(track.lang || track.language || '');
  const name=track.name || track.label || '';
  return [lang, name && name.toLocaleLowerCase('tr')!==lang.toLocaleLowerCase('tr') ? name : ''].filter(Boolean).join(' · ') || `Ses ${index+1}`;
}
export function createAudioSelector({video,hls,events,container,storage=localStorage}) {
  let disposed=false, applying=false, preferred='', manual=false;
  try {preferred=storage.getItem('mbirinci-audio-language') || ''} catch {}
  const removers=[];
  const listen=(target,event,handler)=>{target?.addEventListener?.(event,handler);removers.push(()=>target?.removeEventListener?.(event,handler))};
  const tracks=()=>Array.from(hls ? hls.audioTracks || [] : video.audioTracks || []);
  const selected=()=>hls ? hls.audioTrack : tracks().findIndex(t=>t.enabled);
  const setTrack=index=>{
    if(hls) hls.audioTrack=index;
    else {
      const list=tracks();
      // Enable destination first so the pipeline always has an active track.
      list[index].enabled=true;
      list.forEach((track,i)=>{if(i!==index)track.enabled=false});
    }
  };
  const refresh=()=>{
    if(disposed||applying)return;
    let list=tracks();
    if(preferred && !manual){
      const index=list.findIndex(t=>languageKey(t.lang||t.language||'')===preferred);
      if(index>=0 && selected()!==index){applying=true;try{setTrack(index)}catch{}finally{applying=false}}
    }
    const oldFocus=container.contains(document.activeElement)?document.activeElement.dataset.audioIndex:null;
    container.replaceChildren();
    const heading=document.createElement('h3');heading.textContent='Ses dili / Dublaj';container.append(heading);
    const note=document.createElement('p');note.className='audio-note';note.setAttribute('role','status');
    note.textContent=!list.length?(video.readyState===0?'Ses seçenekleri yayın açıldığında burada görünecek.':'Bu yayın veya cihaz, seçilebilir ses dili bildirmiyor.') : list.length===1?'Bu yayında tek ses seçeneği var.':'Yayının sunduğu seslerden birini seçin. Dil tercihiniz bu cihazda hatırlanır.';
    container.append(note);
    const options=document.createElement('div');options.className='audio-options';options.setAttribute('role','group');options.setAttribute('aria-label','Ses dili');
    list.forEach((track,index)=>{
      const button=document.createElement('button');button.className='chip audio-option';button.dataset.audioIndex=index;
      button.textContent=trackLabel(track,index);button.setAttribute('aria-pressed',String(selected()===index));
      button.onclick=()=>{
        try {
          manual=true;setTrack(index);
          preferred=languageKey(track.lang||track.language||'');
          try{if(preferred)storage.setItem('mbirinci-audio-language',preferred)}catch{}
          refresh();
        } catch {note.textContent='Ses değiştirilemedi. Başka bir ses seçeneği deneyin.'}
      };
      options.append(button);
    });
    container.append(options);
    if(oldFocus!==null)container.querySelector(`[data-audio-index="${oldFocus}"]`)?.focus();
  };
  ['loadedmetadata','loadeddata','canplay','playing'].forEach(event=>listen(video,event,refresh));
  if(hls){
    [events.AUDIO_TRACKS_UPDATED,events.AUDIO_TRACK_SWITCHED].forEach(event=>{hls.on(event,refresh);removers.push(()=>hls.off(event,refresh))});
  } else {
    ['addtrack','removetrack','change'].forEach(event=>listen(video.audioTracks,event,refresh));
  }
  refresh();
  return ()=>{disposed=true;removers.forEach(remove=>remove())};
}
