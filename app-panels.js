'use strict';
(() => {
  const main=$('mainLayout'),splitter=$('mainSplitter'),WIDTH_KEY='pixieverse.previewWidth';
  const mid=document.querySelector('.mid'),timelinePanel=document.querySelector('.timelinepanel'),timelineSplitter=$('timelineSplitter'),TIMELINE_HEIGHT_KEY='pixieverse.timelineHeight';

  function timelineLimits(){
    const total=mid?.clientHeight||500,palette=$('paletteBar')?.getBoundingClientRect().height||43;
    return{min:72,max:Math.max(96,total-palette-190)};
  }
  function currentTimelineHeight(){
    const raw=mid?getComputedStyle(mid).getPropertyValue('--timeline-height'):'';
    return Math.round(parseFloat(raw)||timelinePanel?.getBoundingClientRect().height||145);
  }
  function setTimelineHeight(value,save=true){
    if(!mid||!timelinePanel||timelinePanel.classList.contains('collapsed'))return;
    const lim=timelineLimits(),h=C(Math.round(Number(value)||145),lim.min,lim.max);
    mid.style.setProperty('--timeline-height',h+'px');
    if(save)try{localStorage.setItem(TIMELINE_HEIGHT_KEY,String(h))}catch(_){}
    requestAnimationFrame(()=>window.fitObjectEditorSprites?.());
  }

  function setCollapsed(section,collapsed){
    section.classList.toggle('collapsed',collapsed);
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.setAttribute('aria-expanded',String(!collapsed));
    button.textContent=collapsed?'▸':'▾';
    const title=section.querySelector('h2')?.textContent?.trim()||'menu';
    button.title=(collapsed?'Show ':'Hide ')+title;
    if(section===timelinePanel&&mid){
      if(collapsed){
        section.dataset.restoreHeight=String(currentTimelineHeight());
        mid.style.setProperty('--timeline-height','31px');
        timelineSplitter?.classList.add('disabled');
      }else{
        timelineSplitter?.classList.remove('disabled');
        let restore=Number(section.dataset.restoreHeight)||145;
        try{restore=Number(localStorage.getItem(TIMELINE_HEIGHT_KEY))||restore}catch(_){}
        setTimelineHeight(restore,false);
      }
    }
    if(!collapsed)requestAnimationFrame(()=>{window.redrawPreviewNow?.();window.syncAllSpriteScales?.();window.fitObjectEditorSprites?.()});
  }
  document.querySelectorAll('[data-collapsible]').forEach(section=>{
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.onclick=e=>{e.preventDefault();e.stopPropagation();setCollapsed(section,!section.classList.contains('collapsed'))};
  });

  let splitDrag=false,startX=0,startWidth=286;
  function limits(){const total=main?.getBoundingClientRect().width||window.innerWidth;return{min:190,max:Math.max(220,total-360)}}
  function currentWidth(){const raw=getComputedStyle(main).getPropertyValue('--preview-width');return Math.round(parseFloat(raw)||286)}
  function setPreviewWidth(value,save=true){
    if(!main||window.matchMedia('(max-width:800px)').matches)return;
    const lim=limits(),w=C(Math.round(Number(value)||286),lim.min,lim.max);main.style.setProperty('--preview-width',w+'px');
    if(save)try{localStorage.setItem(WIDTH_KEY,String(w))}catch(_){}
    requestAnimationFrame(()=>{window.redrawPreviewNow?.();window.syncAllSpriteScales?.();window.fitObjectEditorSprites?.()});
  }
  if(main&&splitter){
    let saved=286;try{saved=Number(localStorage.getItem(WIDTH_KEY))||286}catch(_){}setPreviewWidth(saved,false);
    splitter.addEventListener('pointerdown',e=>{if(e.button!==0||window.matchMedia('(max-width:800px)').matches)return;e.preventDefault();splitDrag=true;startX=e.clientX;startWidth=currentWidth();splitter.classList.add('dragging');splitter.setPointerCapture?.(e.pointerId)});
    splitter.addEventListener('pointermove',e=>{if(!splitDrag)return;e.preventDefault();setPreviewWidth(startWidth+e.clientX-startX,false)});
    const stop=e=>{if(!splitDrag)return;splitDrag=false;splitter.classList.remove('dragging');setPreviewWidth(currentWidth(),true);try{splitter.releasePointerCapture?.(e.pointerId)}catch(_){}};
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>splitter.addEventListener(ev,stop));
    splitter.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();setPreviewWidth(currentWidth()+(e.key==='ArrowRight'?16:-16),true)});
  }

  if(mid&&timelinePanel&&timelineSplitter){
    let saved=145;try{saved=Number(localStorage.getItem(TIMELINE_HEIGHT_KEY))||145}catch(_){}setTimelineHeight(saved,false);
    let dragging=false,startY=0,startHeight=145;
    timelineSplitter.addEventListener('pointerdown',e=>{if(e.button!==0||timelinePanel.classList.contains('collapsed'))return;e.preventDefault();dragging=true;startY=e.clientY;startHeight=currentTimelineHeight();timelineSplitter.classList.add('dragging');timelineSplitter.setPointerCapture?.(e.pointerId)});
    timelineSplitter.addEventListener('pointermove',e=>{if(!dragging)return;e.preventDefault();setTimelineHeight(startHeight+startY-e.clientY,false)});
    const stopTimeline=e=>{if(!dragging)return;dragging=false;timelineSplitter.classList.remove('dragging');setTimelineHeight(currentTimelineHeight(),true);try{timelineSplitter.releasePointerCapture?.(e.pointerId)}catch(_){}};
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>timelineSplitter.addEventListener(ev,stopTimeline));
    timelineSplitter.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();setTimelineHeight(currentTimelineHeight()+(e.key==='ArrowUp'?16:-16),true)});
  }

  window.addEventListener('resize',()=>{setPreviewWidth(currentWidth(),false);if(!timelinePanel?.classList.contains('collapsed'))setTimelineHeight(currentTimelineHeight(),false);window.redrawPreviewNow?.();window.fitObjectEditorSprites?.()});
  editorZoom=.5;
  applyEditorScale();
  window.syncAllSpriteScales?.();
  requestAnimationFrame(()=>window.fitObjectEditorSprites?.());
})();
