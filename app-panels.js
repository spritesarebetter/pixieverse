'use strict';
(() => {
  function setCollapsed(section,collapsed){
    section.classList.toggle('collapsed',collapsed);
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.setAttribute('aria-expanded',String(!collapsed));
    button.textContent=collapsed?'▸':'▾';
    const title=section.querySelector('h2')?.textContent?.trim()||'menu';
    button.title=(collapsed?'Show ':'Hide ')+title;
    if(!collapsed)requestAnimationFrame(()=>{window.redrawPreviewNow?.();window.syncAllSpriteScales?.();window.fitObjectEditorSprites?.()});
  }
  document.querySelectorAll('[data-collapsible]').forEach(section=>{
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.onclick=e=>{e.preventDefault();e.stopPropagation();setCollapsed(section,!section.classList.contains('collapsed'))};
  });

  const main=$('mainLayout'),splitter=$('mainSplitter'),WIDTH_KEY='pixieverse.previewWidth';
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

  window.addEventListener('resize',()=>{setPreviewWidth(currentWidth(),false);window.redrawPreviewNow?.();window.fitObjectEditorSprites?.()});
  editorZoom=.5;
  applyEditorScale();
  window.syncAllSpriteScales?.();
  requestAnimationFrame(()=>window.fitObjectEditorSprites?.());
})();
