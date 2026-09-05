import {trackLabel} from './audio.js';
export function createSubtitleSelector({video,hls,events,container}){
  const cleanup=[];let applying=false;
  const tracks=()=>hls?hls.subtitleTracks||[]:Array.from(video.textTracks||[]).filter(t=>['subtitles','captions'].includes(t.kind));
  const draw=()=>{
    if(applying)return;
    const focus=container.contains(document.activeElement)?document.activeElement.dataset.subtitleIndex:null;
    container.replaceChildren();const title=document.createElement('h3');title.textContent='Altyazı';container.append(title);
    const list=tracks();const selected=hls?hls.subtitleTrack:list.findIndex(t=>t.mode==='showing');
    const options=document.createElement('div');options.className='audio-options';
    [{label:'Kapalı',index:-1},...list.map((t,index)=>({label:trackLabel(t,index).replace(/^Ses /,'Altyazı '),index}))].forEach(({label,index})=>{
      const button=document.createElement('button');button.className='chip audio-option';button.textContent=label;button.dataset.subtitleIndex=index;button.setAttribute('aria-pressed',String(index===selected));
      button.onclick=()=>{applying=true;try{if(hls){hls.subtitleTrack=index;hls.subtitleDisplay=index>=0}else list.forEach((t,i)=>t.mode=i===index?'showing':'disabled')}finally{applying=false}draw()};options.append(button);
    });container.append(options);
    if(!list.length){const note=document.createElement('p');note.textContent='Bu yayında seçilebilir altyazı bildirilmedi.';container.append(note)}
    if(focus!==null)container.querySelector(`[data-subtitle-index="${focus}"]`)?.focus();
  };
  const listen=(target,name)=>{target?.addEventListener?.(name,draw);cleanup.push(()=>target?.removeEventListener?.(name,draw))};
  ['loadedmetadata','loadeddata'].forEach(name=>listen(video,name));
  if(hls){[events.SUBTITLE_TRACKS_UPDATED,events.SUBTITLE_TRACK_SWITCH].filter(Boolean).forEach(name=>{hls.on(name,draw);cleanup.push(()=>hls.off(name,draw))})}
  else ['addtrack','removetrack','change'].forEach(name=>listen(video.textTracks,name));
  draw();return ()=>cleanup.forEach(fn=>fn());
}
