'use strict';
(() => {
  const canvas=$('previewCanvas'),wrap=$('previewWrap'),stage=$('editorStage'),spriteButtons=$('previewSpriteButtons'),previewPalette=$('previewPalette');
  let zoom=1,showBorders=true,scheduled=0,pendingFrame=null,hover=null,blinkOn=false,blinkTimer=0;
  let panX=0,panY=0,panning=false,panStartX=0,panStartY=0,pointerStartX=0,pointerStartY=0;
  let drawing=false,drawErase=false,drawLast=null,drawTarget=-1,drawChanged=false,drawSelectionChanged=false,drawPointerId=null;

  function boxes(frame){
    const n=sz(),out=[];
    frame.sprites.forEach((s,index)=>{if(!s.visible)return;const x=spriteOffsetX(s,index),y=spriteOffsetY(s,index);out.push({s,index,x,y,right:x+n,bottom:y+n})});
    return out;
  }
  function bounds(frame){
    const n=sz(),visible=boxes(frame);
    if(!visible.length)return{minX:0,minY:0,maxX:n,maxY:n,w:n,h:n};
    const minX=Math.min(...visible.map(b=>b.x)),minY=Math.min(...visible.map(b=>b.y)),maxX=Math.max(...visible.map(b=>b.right)),maxY=Math.max(...visible.map(b=>b.bottom));
    return{minX,minY,maxX,maxY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }
  function compose(frame,b){
    const cells=new Int16Array(b.w*b.h);cells.fill(-1);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)cells[y*b.w+x]=spriteMode2ColorAt(frame,b.minX+x,b.minY+y);
    return cells;
  }
  function fitCell(){
    const w=Number(canvas.dataset.gridW)||sz(),h=Number(canvas.dataset.gridH)||sz(),availW=Math.max(24,wrap.clientWidth-12),availH=Math.max(24,wrap.clientHeight-12);
    return Math.max(.05,Math.min(availW/w,availH/h))*zoom;
  }
  function syncCss(){
    const w=Number(canvas.dataset.gridW)||sz(),h=Number(canvas.dataset.gridH)||sz(),cell=fitCell();
    canvas.style.width=Math.max(1,w*cell)+'px';canvas.style.height=Math.max(1,h*cell)+'px';canvas.style.transform='translate3d('+panX+'px,'+panY+'px,0)';
    $('previewZoom').textContent=Math.round(zoom*100)+'%';syncSpriteHoverOverlay();
  }
  function drawGridInsideSprites(g,frame,b,cell){
    const n=sz();g.save();g.strokeStyle='rgba(255,255,255,.13)';g.lineWidth=1;
    boxes(frame).forEach(box=>{const x0=(box.x-b.minX)*cell,y0=(box.y-b.minY)*cell,x1=x0+n*cell,y1=y0+n*cell;g.beginPath();for(let x=0;x<=n;x++){const px=x0+x*cell+.5;g.moveTo(px,y0);g.lineTo(px,y1)}for(let y=0;y<=n;y++){const py=y0+y*cell+.5;g.moveTo(x0,py);g.lineTo(x1,py)}g.stroke()});g.restore();
  }
  function renderPreviewPalette(){
    if(!previewPalette)return;previewPalette.innerHTML='';
    PAL.forEach((color,index)=>{const b=document.createElement('button');b.type='button';b.title='Color '+index;b.setAttribute('aria-label','Color '+index);b.setAttribute('aria-pressed',String(index===K));b.style.cssText='display:block;width:100%;min-width:0;height:20px;min-height:20px;padding:0;border:1px solid var(--ln);border-radius:2px;background:'+color+';box-shadow:'+(index===K?'inset 0 0 0 2px #fff':'none')+';outline:'+(index===K?'1px solid var(--ac)':'none')+';outline-offset:-1px';b.onclick=e=>{e.preventDefault();e.stopPropagation();K=index;renderPreviewPalette();if(typeof palette==='function')palette();refreshHover();setStatus('Color '+index)};previewPalette.appendChild(b)});
  }
  function renderSpriteButtons(){
    if(!spriteButtons)return;spriteButtons.innerHTML='';
    fr().sprites.forEach((s,index)=>{const b=document.createElement('button');b.type='button';b.className='previewspritebutton'+(index===S?' on':'');b.textContent='Sprite #'+index;b.title='Select Sprite #'+index;b.onclick=e=>{e.preventDefault();e.stopPropagation();S=index;render()};spriteButtons.appendChild(b)});
  }
  function hoverCurrentColor(){
    if(!hover)return 0;const s=fr().sprites[hover.index];if(!s)return 0;return s.mask[hover.y]?.[hover.x]?(s.lines[hover.y]?.color&15):0;
  }
  function draw(frame=fr()){
    const b=bounds(frame),cell=Math.max(2,Math.min(16,Math.floor(2048/Math.max(b.w,b.h)))),g=canvas.getContext('2d'),cells=compose(frame,b);
    canvas.dataset.gridW=String(b.w);canvas.dataset.gridH=String(b.h);canvas.dataset.bounds=[b.minX,b.minY,b.maxX,b.maxY].join(',');canvas.width=b.w*cell;canvas.height=b.h*cell;
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);g.fillStyle='#000';g.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const col=cells[y*b.w+x];if(col>=0){g.fillStyle=PAL[col];g.fillRect(x*cell,y*cell,cell,cell)}}
    drawGridInsideSprites(g,frame,b,cell);
    if(showBorders)frame.sprites.forEach((s,index)=>{if(!s.visible)return;const x=(spriteOffsetX(s,index)-b.minX)*cell,y=(spriteOffsetY(s,index)-b.minY)*cell;g.save();g.lineWidth=2;g.strokeStyle=spritePriority(s,index)===0?'rgba(101,215,192,.9)':(index===S?'rgba(255,255,255,.9)':'rgba(255,255,255,.45)');if(spritePriority(s,index)>0)g.setLineDash([Math.max(3,cell*.25),Math.max(2,cell*.15)]);g.strokeRect(x+1,y+1,sz()*cell-2,sz()*cell-2);g.restore()});
    if(hover){const s=frame.sprites[hover.index];if(s){const x=(spriteOffsetX(s,hover.index)+hover.x-b.minX)*cell,y=(spriteOffsetY(s,hover.index)+hover.y-b.minY)*cell;if(x+cell>=0&&y+cell>=0&&x<=canvas.width&&y<=canvas.height){g.save();g.fillStyle=PAL[blinkOn?K:hoverCurrentColor()]||'#fff';g.fillRect(x+1,y+1,Math.max(1,cell-2),Math.max(1,cell-2));g.lineWidth=Math.max(2,cell*.1);g.strokeStyle=blinkOn?'#fff':'#111';g.strokeRect(x+1,y+1,Math.max(1,cell-2),Math.max(1,cell-2));g.restore()}}}
    renderSpriteButtons();renderPreviewPalette();syncCss();
  }
  function schedule(frame=fr()){pendingFrame=frame;if(scheduled)return;scheduled=requestAnimationFrame(()=>{scheduled=0;draw(pendingFrame||fr());pendingFrame=null})}
  function canvasLogicalPoint(e){
    const r=canvas.getBoundingClientRect(),w=Number(canvas.dataset.gridW),h=Number(canvas.dataset.gridH),parts=String(canvas.dataset.bounds||'').split(',').map(Number);
    if(!r.width||!r.height||!w||!h||parts.length!==4||parts.some(v=>!Number.isFinite(v)))return null;if(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return null;
    return{gx:parts[0]+Math.floor((e.clientX-r.left)/r.width*w),gy:parts[1]+Math.floor((e.clientY-r.top)/r.height*h)};
  }
  function localPointFor(index,p){const s=fr().sprites[index];if(!s||!s.visible||!p)return null;const x=p.gx-spriteOffsetX(s,index),y=p.gy-spriteOffsetY(s,index),n=sz();return x>=0&&y>=0&&x<n&&y<n?{x,y}:null}
  function spriteHitAt(p){if(!p)return null;const n=sz();return spritesByPriority(fr(),true).find(({s,index})=>s.visible&&p.gx>=spriteOffsetX(s,index)&&p.gx<spriteOffsetX(s,index)+n&&p.gy>=spriteOffsetY(s,index)&&p.gy<spriteOffsetY(s,index)+n)||null}

  function ensureSpriteOverlay(unit){
    const body=unit?.querySelector('.spritebody');if(!body)return null;let o=body.querySelector('.spritepixelhover');if(!o){o=document.createElement('div');o.className='spritepixelhover';body.appendChild(o)}return o;
  }
  function syncGridGuards(){
    if(!stage)return;const n=sz();stage.querySelectorAll('.spriteunit').forEach(unit=>{const body=unit.querySelector('.spritebody'),c=unit.querySelector('.spritecanvas');if(!body||!c||!c.clientWidth)return;let guard=body.querySelector('.spritegridguard');if(!guard){guard=document.createElement('div');guard.className='spritegridguard';body.appendChild(guard)}const cell=c.clientWidth/n;guard.style.left=c.offsetLeft+'px';guard.style.top=c.offsetTop+'px';guard.style.width=c.clientWidth+'px';guard.style.height=c.clientHeight+'px';guard.style.backgroundSize=cell+'px '+cell+'px'});
  }
  window.syncSpriteGridOverlays=syncGridGuards;
  function syncSpriteHoverOverlay(){
    if(!stage)return;stage.querySelectorAll('.spritepixelhover').forEach(o=>o.style.display='none');stage.querySelectorAll('.spritecanvas').forEach(c=>c.style.cursor='crosshair');
    if(!hover)return;const unit=stage.querySelector('.spriteunit[data-sprite-index="'+hover.index+'"]'),c=unit?.querySelector('.spritecanvas'),o=ensureSpriteOverlay(unit);if(!c||!o||!c.clientWidth)return;const n=sz(),cw=c.clientWidth/n,ch=c.clientHeight/n;o.style.display='block';o.style.left=(c.offsetLeft+hover.x*cw)+'px';o.style.top=(c.offsetTop+hover.y*ch)+'px';o.style.width=Math.max(1,cw)+'px';o.style.height=Math.max(1,ch)+'px';o.style.background=PAL[blinkOn?K:hoverCurrentColor()]||'#fff';o.style.borderColor=blinkOn?'#fff':'#111';if(hover.source==='sprites')c.style.cursor='none';syncGridGuards();
  }
  function setHover(index,x,y,source){
    const next={index:Number(index)||0,x:C(Math.floor(x),0,sz()-1),y:C(Math.floor(y),0,sz()-1),source:source||'object'};
    if(hover&&hover.index===next.index&&hover.x===next.x&&hover.y===next.y&&hover.source===next.source)return;hover=next;blinkOn=false;schedule();syncSpriteHoverOverlay();
  }
  function clearHover(){if(!hover)return;hover=null;wrap.style.cursor='grab';schedule();syncSpriteHoverOverlay()}
  function refreshHover(){if(!hover)return;schedule();syncSpriteHoverOverlay()}
  window.setPreviewHover=(index,x,y)=>setHover(index,x,y,'sprites');window.clearPreviewHover=clearHover;

  function redrawSpriteCanvas(index){
    const unit=stage?.querySelector('.spriteunit[data-sprite-index="'+index+'"]'),c=unit?.querySelector('.spritecanvas'),s=fr().sprites[index];if(!c||!s)return;const n=sz(),g=c.getContext('2d'),scale=Math.max(1,Math.round(c.width/n));g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.clearRect(0,0,c.width,c.height);for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillStyle=PAL[s.mask[y][x]?s.lines[y].color:0];g.fillRect(x*scale,y*scale,scale,scale)}g.strokeStyle='rgba(255,255,255,.16)';g.lineWidth=Math.max(1,Math.round(window.devicePixelRatio||1));for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}syncGridGuards();
  }
  function paintLine(s,a,b,value){
    let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy,changed=false;
    for(;;){const colored=value&&K!==0,next=colored?1:0;if(s.mask[y0][x0]!==next){s.mask[y0][x0]=next;changed=true}if(colored&&s.lines[y0].color!==K){s.lines[y0].color=K;changed=true}if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}return changed;
  }
  function paintAtObjectPoint(p){
    const hit=spriteHitAt(p);if(!hit){drawLast=null;drawTarget=-1;clearHover();return}
    const local=localPointFor(hit.index,p);if(!local)return;
    if(S!==hit.index){S=hit.index;drawSelectionChanged=true}
    const same=drawTarget===hit.index;drawChanged=paintLine(hit.s,same&&drawLast?drawLast:local,local,!drawErase)||drawChanged;drawTarget=hit.index;drawLast=local;L=local.y;setHover(hit.index,local.x,local.y,'object');redrawSpriteCanvas(hit.index);schedule();
  }
  function updateObjectCursor(e){
    if(panning){wrap.style.cursor='grabbing';return}const p=canvasLogicalPoint(e),hit=spriteHitAt(p);if(hit){const local=localPointFor(hit.index,p);if(local)setHover(hit.index,local.x,local.y,'object');wrap.style.cursor='none'}else{clearHover();wrap.style.cursor='grab'}
  }
  function beginDrawing(e,p){
    if($('selectTool')?.classList.contains('on'))return false;const hit=spriteHitAt(p);if(!hit)return false;e.preventDefault();drawing=true;drawPointerId=e.pointerId;drawErase=e.button===2||tool==='eraser';drawLast=null;drawTarget=-1;drawChanged=false;drawSelectionChanged=false;wrap.setPointerCapture?.(e.pointerId);paintAtObjectPoint(p);return true;
  }
  function endPointer(e){
    if(drawing&&e.pointerId===drawPointerId){drawing=false;drawPointerId=null;drawLast=null;drawTarget=-1;const changed=drawChanged,selectionChanged=drawSelectionChanged;drawChanged=false;drawSelectionChanged=false;if(changed)dirty();if(changed||selectionChanged)render();else schedule();try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){}requestAnimationFrame(()=>{syncGridGuards();syncSpriteHoverOverlay()});updateObjectCursor(e);return}
    if(!panning)return;panning=false;wrap.classList.remove('panning');try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){}updateObjectCursor(e);
  }

  window.renderCompositePreview=()=>schedule(fr());window.redrawPreviewNow=()=>draw(fr());
  window.showPreviewFrame=()=>{};window.clearPreviewFrame=()=>{};
  $('previewZoomIn').onclick=()=>{zoom=C(Math.round((zoom+.1)*10)/10,.1,8);syncCss()};$('previewZoomOut').onclick=()=>{zoom=C(Math.round((zoom-.1)*10)/10,.1,8);syncCss()};
  $('previewBorders').onclick=()=>{showBorders=!showBorders;$('previewBorders').classList.toggle('on',showBorders);$('previewBorders').setAttribute('aria-pressed',String(showBorders));schedule()};
  wrap.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoom=C(Math.round((zoom+(e.deltaY<0?.1:-.1))*10)/10,.1,8);syncCss()},{passive:false});
  wrap.addEventListener('contextmenu',e=>{if(spriteHitAt(canvasLogicalPoint(e)))e.preventDefault()});
  wrap.addEventListener('pointerdown',e=>{const p=canvasLogicalPoint(e),hit=spriteHitAt(p);if((e.button===0||e.button===2)&&hit&&beginDrawing(e,p))return;if(hit){e.preventDefault();return}if(e.button!==0)return;e.preventDefault();clearHover();panning=true;pointerStartX=e.clientX;pointerStartY=e.clientY;panStartX=panX;panStartY=panY;wrap.classList.add('panning');wrap.style.cursor='grabbing';wrap.setPointerCapture?.(e.pointerId)});
  wrap.addEventListener('pointermove',e=>{if(drawing&&e.pointerId===drawPointerId){e.preventDefault();paintAtObjectPoint(canvasLogicalPoint(e));return}if(panning){e.preventDefault();panX=Math.round(panStartX+e.clientX-pointerStartX);panY=Math.round(panStartY+e.clientY-pointerStartY);syncCss();return}updateObjectCursor(e)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>wrap.addEventListener(ev,endPointer));
  wrap.addEventListener('dblclick',e=>{if(spriteHitAt(canvasLogicalPoint(e)))return;e.preventDefault();panX=panY=0;syncCss()});wrap.addEventListener('pointerleave',()=>{if(!panning&&!drawing)clearHover()});

  if(stage){
    stage.addEventListener('pointermove',e=>{const c=e.target instanceof HTMLCanvasElement&&e.target.classList.contains('spritecanvas')?e.target:null;if(!c)return;const unit=c.closest('.spriteunit');if(!unit)return;const r=c.getBoundingClientRect();if(!r.width||!r.height)return;const x=C(Math.floor((e.clientX-r.left)/r.width*sz()),0,sz()-1),y=C(Math.floor((e.clientY-r.top)/r.height*sz()),0,sz()-1);setHover(Number(unit.dataset.spriteIndex)||0,x,y,'sprites')},true);
    stage.addEventListener('pointerout',e=>{if(e.target instanceof HTMLCanvasElement&&e.target.classList.contains('spritecanvas')&&!drawing)clearHover()},true);stage.addEventListener('pointerleave',()=>{if(!drawing)clearHover()},true);
    if(typeof MutationObserver!=='undefined')new MutationObserver(()=>requestAnimationFrame(()=>{syncGridGuards();syncSpriteHoverOverlay()})).observe(stage,{childList:true,subtree:true});
  }
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>{syncCss();syncGridGuards();syncSpriteHoverOverlay()}).observe(wrap);if($('editorWrap'))new ResizeObserver(()=>{syncGridGuards();syncSpriteHoverOverlay()}).observe($('editorWrap'))}else window.addEventListener('resize',()=>{syncCss();syncGridGuards();syncSpriteHoverOverlay()});
  blinkTimer=setInterval(()=>{if(!hover)return;blinkOn=!blinkOn;schedule();syncSpriteHoverOverlay()},280);
  window.addEventListener('beforeunload',()=>clearInterval(blinkTimer));
  draw();requestAnimationFrame(syncGridGuards);
})();