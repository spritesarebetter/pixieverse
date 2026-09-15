'use strict';
(() => {
  const stage=$('editorStage'),objectBody=document.querySelector('#previewSection > .collapsebody'),paletteBar=$('paletteBar'),previewPalette=$('previewPalette');

  function movePaletteIntoObject(){
    if(!objectBody||!paletteBar||!previewPalette)return;
    paletteBar.classList.add('objectpalettecontrols');
    const duplicate=$('palette');if(duplicate)duplicate.classList.add('palettehiddenmirror');
    previewPalette.insertAdjacentElement('afterend',paletteBar);
  }

  function normalizeRailLabels(root=document){
    root.querySelectorAll('.colorlabels').forEach(labels=>{
      const spans=labels.querySelectorAll('span');
      if(spans[0])spans[0].textContent='Color';
      if(spans[1])spans[1].textContent='OR';
    });
  }

  function syncUnitLineColors(unit){
    if(!unit)return;
    const index=Number(unit.dataset.spriteIndex);if(!Number.isFinite(index))return;
    const s=fr().sprites[index];if(!s)return;
    unit.querySelectorAll('.linecolorswatch').forEach((sw,y)=>{if(s.lines[y])sw.style.background=PAL[s.lines[y].color&15]});
  }

  function queueUnitSync(target){
    const unit=target?.closest?.('.spriteunit');
    if(!unit)return;
    requestAnimationFrame(()=>{syncUnitLineColors(unit);normalizeRailLabels(unit)});
  }

  movePaletteIntoObject();normalizeRailLabels();
  if(stage){
    stage.addEventListener('pointerdown',e=>queueUnitSync(e.target),true);
    stage.addEventListener('pointermove',e=>queueUnitSync(e.target),true);
    if(typeof MutationObserver!=='undefined')new MutationObserver(mutations=>{
      for(const m of mutations)for(const node of m.addedNodes)if(node.nodeType===1){normalizeRailLabels(node);const unit=node.matches?.('.spriteunit')?node:node.querySelector?.('.spriteunit');if(unit)syncUnitLineColors(unit)}
    }).observe(stage,{childList:true,subtree:true});
  }
})();