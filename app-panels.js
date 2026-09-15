'use strict';
(() => {
  if(!document.querySelector('link[href*="workspace.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='workspace.css?v=20260916b';document.head.appendChild(link)}
  const objectTitle=document.querySelector('#previewSection .sectionhead h2');if(objectTitle)objectTitle.textContent='Object';
  const objectToggle=document.querySelector('#previewSection .collapseToggle');if(objectToggle)objectToggle.title='Hide Object';
  const main=$('mainLayout'),splitter=$('mainSplitter'),WIDTH_KEY='pixieverse.previewWidth';
  if(splitter)splitter.setAttribute('aria-label','Resize Object and Sprites');
  const mid=document.querySelector('.mid'),timelinePanel=document.querySelector('.timelinepanel'),timelineSplitter=$('timelineSplitter'),TIMELINE_HEIGHT_KEY='pixieverse.timelineHeight';
  const editorWrap=$('editorWrap'),stage=$('editorStage');

  const baseProps=props;
  props=function(){baseProps();const title=$('title');if(title)title.textContent='Sprites'};
  if($('title'))$('title').textContent='Sprites';

  let userManualZoom=false,fitQueued=0,fitting=false;
  const baseChangeEditorZoom=changeEditorZoom;
  baseChangeEditorZoom(0);
  changeEditorZoom=function(delta){if(delta!==0)userManualZoom=true;baseChangeEditorZoom(delta);window.syncSpriteGridOverlays?.()};
  function stableFitNow(force=false){
    if(!editorWrap||!stage||fitting)return;const unit=stage.querySelector('.spriteunit');if(!unit)return;
    const availableW=Math.max(110,editorWrap.clientWidth-18),availableH=Math.max(70,editorWrap.clientHeight-18),current=stage.getBoundingClientRect(),overflow=current.width>availableW+1||current.height>availableH+1;
    if(userManualZoom&&!force&&!overflow)return;
    fitting=true;
    try{
      let lo=.1,hi=userManualZoom&&!force?Math.max(.1,editorZoom):8,best=.1;
      for(let i=0;i<12;i++){
        const midZoom=(lo+hi)/2;editorZoom=midZoom;applyEditorScale();
        const rect=stage.getBoundingClientRect(),fits=rect.width<=availableW&&rect.height<=availableH;
        if(fits){best=midZoom;lo=midZoom}else hi=midZoom;
      }
      editorZoom=Math.max(.1,Math.floor(best*100)/100);applyEditorScale();window.syncSpriteGridOverlays?.();
    }finally{fitting=false}
  }
  function queueStableFit(force=false){if(fitQueued)cancelAnimationFrame(fitQueued);fitQueued=requestAnimationFrame(()=>{fitQueued=0;stableFitNow(force)})}
  window.fitObjectEditorSprites=(iterations,force=false)=>queueStableFit(force);window.resetObjectEditorFit=()=>{userManualZoom=false;queueStableFit(true)};

  function timelineLimits(){const total=mid?.clientHeight||500,palette=$('paletteBar')?.getBoundingClientRect().height||43;return{min:86,max:Math.max(110,total-palette-190)}}
  function currentTimelineHeight(){const raw=mid?getComputedStyle(mid).getPropertyValue('--timeline-height'):'';return Math.round(parseFloat(raw)||document.querySelector('.animationrow')?.getBoundingClientRect().height||145)}
  function setTimelineHeight(value,save=true){if(!mid)return;const lim=timelineLimits(),h=C(Math.round(Number(value)||145),lim.min,lim.max);mid.style.setProperty('--timeline-height',h+'px');if(save)try{localStorage.setItem(TIMELINE_HEIGHT_KEY,String(h))}catch(_){}queueStableFit();window.redrawAnimationPreview?.()}

  function setCollapsed(section,collapsed){section.classList.toggle('collapsed',collapsed);const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');if(!button)return;button.setAttribute('aria-expanded',String(!collapsed));button.textContent=collapsed?'▸':'▾';const title=section.querySelector('h2')?.textContent?.trim()||'menu';button.title=(collapsed?'Show ':'Hide ')+title;if(!collapsed)requestAnimationFrame(()=>{window.redrawPreviewNow?.();window.syncAllSpriteScales?.();queueStableFit();window.redrawAnimationPreview?.()})}
  document.querySelectorAll('[data-collapsible]').forEach(section=>{const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');if(button)button.onclick=e=>{e.preventDefault();e.stopPropagation();setCollapsed(section,!section.classList.contains('collapsed'))}});

  let splitDrag=false,startX=0,startWidth=360;
  function limits(){const total=main?.getBoundingClientRect().width||window.innerWidth;return{min:230,max:Math.max(300,total-420)}}
  function currentWidth(){const raw=getComputedStyle(main).getPropertyValue('--preview-width');return Math.round(parseFloat(raw)||360)}
  function setPreviewWidth(value,save=true){if(!main||window.matchMedia('(max-width:800px)').matches)return;const lim=limits(),w=C(Math.round(Number(value)||360),lim.min,lim.max);main.style.setProperty('--preview-width',w+'px');if(save)try{localStorage.setItem(WIDTH_KEY,String(w))}catch(_){}requestAnimationFrame(()=>{window.redrawPreviewNow?.();queueStableFit();window.redrawAnimationPreview?.()})}
  if(main&&splitter){let saved=360;try{saved=Number(localStorage.getItem(WIDTH_KEY))||360}catch(_){}setPreviewWidth(saved,false);splitter.addEventListener('pointerdown',e=>{if(e.button!==0||window.matchMedia('(max-width:800px)').matches)return;e.preventDefault();splitDrag=true;startX=e.clientX;startWidth=currentWidth();splitter.classList.add('dragging');splitter.setPointerCapture?.(e.pointerId)});splitter.addEventListener('pointermove',e=>{if(!splitDrag)return;e.preventDefault();setPreviewWidth(startWidth+e.clientX-startX,false)});const stop=e=>{if(!splitDrag)return;splitDrag=false;splitter.classList.remove('dragging');setPreviewWidth(currentWidth(),true);try{splitter.releasePointerCapture?.(e.pointerId)}catch(_){}};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>splitter.addEventListener(ev,stop));splitter.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();setPreviewWidth(currentWidth()+(e.key==='ArrowRight'?16:-16),true)})}

  if(mid&&timelineSplitter){let saved=145;try{saved=Number(localStorage.getItem(TIMELINE_HEIGHT_KEY))||145}catch(_){}setTimelineHeight(saved,false);let dragging=false,startY=0,startHeight=145;timelineSplitter.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();dragging=true;startY=e.clientY;startHeight=currentTimelineHeight();timelineSplitter.classList.add('dragging');timelineSplitter.setPointerCapture?.(e.pointerId)});timelineSplitter.addEventListener('pointermove',e=>{if(!dragging)return;e.preventDefault();setTimelineHeight(startHeight+startY-e.clientY,false)});const stopTimeline=e=>{if(!dragging)return;dragging=false;timelineSplitter.classList.remove('dragging');setTimelineHeight(currentTimelineHeight(),true);try{timelineSplitter.releasePointerCapture?.(e.pointerId)}catch(_){}};['pointerup','pointercancel','lostpointercapture'].forEach(ev=>timelineSplitter.addEventListener(ev,stopTimeline));timelineSplitter.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();setTimelineHeight(currentTimelineHeight()+(e.key==='ArrowUp'?16:-16),true)})}

  if(typeof ResizeObserver!=='undefined'&&editorWrap)new ResizeObserver(()=>queueStableFit()).observe(editorWrap);
  window.addEventListener('resize',()=>{setPreviewWidth(currentWidth(),false);setTimelineHeight(currentTimelineHeight(),false);window.redrawPreviewNow?.();queueStableFit();window.redrawAnimationPreview?.()});requestAnimationFrame(()=>queueStableFit(true));
})();
