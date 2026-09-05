export function autoHideControls(player,video,delay=3500){
  let timer;const removers=[];
  const listen=(target,name,fn,options)=>{target.addEventListener(name,fn,options);removers.push(()=>target.removeEventListener(name,fn,options))};
  const show=()=>{
    clearTimeout(timer);player.classList.remove('controls-hidden');video.controls=true;
    if(video.paused||video.ended||video.error||!player.querySelector('#language-panel').hidden)return;
    timer=setTimeout(()=>{
      if(!player.querySelector('#language-panel').hidden)return;
      if(player.contains(document.activeElement)&&document.activeElement!==video)video.focus({preventScroll:true});
      player.classList.add('controls-hidden');video.controls=false;
    },delay);
  };
  const key=event=>{
    const hidden=player.classList.contains('controls-hidden');show();
    if(hidden&&['Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();event.stopImmediatePropagation();player.querySelector('#toggle-play')?.focus();
    }
  };
  ['pointermove','mousemove','pointerdown','click','wheel','focusin'].forEach(name=>listen(player,name,show));
  ['playing','pause','ended','error','loadstart'].forEach(name=>listen(video,name,show));
  listen(document,'keydown',key,true);
  // Menu changes made by Back or a language button also restart the inactivity timer.
  const observer=new MutationObserver(show);observer.observe(player.querySelector('#language-panel'),{attributes:true,attributeFilter:['hidden']});
  show();return ()=>{clearTimeout(timer);observer.disconnect();removers.forEach(fn=>fn())};
}
