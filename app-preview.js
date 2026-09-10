'use strict';
(() => {
  const canvas=$('previewCanvas'),wrap=$('previewWrap'),stage=$('editorStage'),spriteButtons=$('previewSpriteButtons');
  let zoom=1,showBorders=true,overrideFrame=null,scheduled=0,pendingFrame=null,hover=null;
  let panX=0,panY=0,panning=false,panStartX=0,panStartY=0,pointerStartX=0,pointerStartY=0;
  let drawing=false,drawErase=false,drawLast=null,drawChanged=false,drawPointerId=null;

  function boxes(frame){
    const n=sz(),out=[];
    frame.sprites.forEach((s,index)=>{
      if(!s.visible)return;
      const x=spriteOffsetX(s,index),y=spriteOffsetY(s,index);
      out.push({s,index,x,y,right:x+n,bottom:y+n});
    });
    return out;
  }

  function bounds(frame){
    const n=sz(),visible=boxes(frame);
    if(!visible.length)return{minX:0,minY:0,maxX:n,maxY:n,w:n,h:n};
    const minX=Math.min(...visible.map(b=>b.x)),minY=Math.min(...visible.map(b=>b.y));
    const maxX=Math.max(...visible.map(b=>b.right)),maxY=Math.max(...visible.map(b=>b.bottom));
    return{minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
  }

  function compose(frame,b){
    const cells=new Int16Array(b.w*b.h);cells.fill(-1);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)cells[y*b.w+x]=spriteMode2ColorAt(frame,b.minX+x,b.minY+y);
    return cells;
  }

  function fitCell(){
    const w=Number(canvas.dataset.gridW)||sz(),h=Number(canvas.dataset.gridH)||sz();
    const availW=Math.max(24,wrap.clientWidth-12),availH=Math.max(24,wrap.clientHeight-12);
    return Math.max(.05,Math.min(availW/w,availH/h))*zoom;
  }

  function syncCss(){
    const w=Number(canvas.dataset.gridW)||sz(),h=Number(canvas.dataset.gridH)||sz(),cell=fitCell();
    canvas.style.width=Math.max(1,w*cell)+'px';canvas.style.height=Math.max(1,h*cell)+'px';
    canvas.style.transform='translate3d('+panX+'px,'+panY+'px,0)';
    $('previewZoom').textContent=Math.round(zoom*100)+'%';
  }

  function drawGridInsideSprites(g,frame,b,cell){
    const n=sz();
    g.save();g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;
    boxes(frame).forEach(box=>{
      const x0=(box.x-b.minX)*cell,y0=(box.y-b.minY)*cell,x1=x0+n*cell,y1=y0+n*cell;
      g.beginPath();
      for(let x=0;x<=n;x++){const px=x0+x*cell+.5;g.moveTo(px,y0);g.lineTo(px,y1)}
      for(let y=0;y<=n;y++){const py=y0+y*cell+.5;g.moveTo(x0,py);g.lineTo(x1,py)}
      g.stroke();
    });
    g.restore();
  }

  function renderSpriteButtons(){
    if(!spriteButtons)return;
    spriteButtons.innerHTML='';
    fr().sprites.forEach((s,index)=>{
      const b=document.createElement('button');b.type='button';b.className='previewspritebutton'+(index===S?' on':'');b.textContent='Sprite #'+index;b.title='Draw on Sprite #'+index;
      b.onclick=e=>{e.preventDefault();e.stopPropagation();S=index;render()};
      spriteButtons.appendChild(b);
    });
  }

  function draw(frame=fr()){
    const b=bounds(frame),cell=Math.max(2,Math.min(16,Math.floor(2048/Math.max(b.w,b.h)))),g=canvas.getContext('2d'),cells=compose(frame,b);
    canvas.dataset.gridW=String(b.w);canvas.dataset.gridH=String(b.h);
    canvas.dataset.bounds=[b.minX,b.minY,b.maxX,b.maxY].join(',');
    canvas.width=b.w*cell;canvas.height=b.h*cell;
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
    g.fillStyle='#000';g.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
      const col=cells[y*b.w+x];
      if(col>=0){g.fillStyle=PAL[col];g.fillRect(x*cell,y*cell,cell,cell)}
    }
    drawGridInsideSprites(g,frame,b,cell);
    if(showBorders){
      frame.sprites.forEach((s,index)=>{
        if(!s.visible)return;
        const x=(spriteOffsetX(s,index)-b.minX)*cell,y=(spriteOffsetY(s,index)-b.minY)*cell;
        g.save();g.lineWidth=2;
        g.strokeStyle=index===0?'rgba(101,215,192,.9)':(frame===fr()&&index===S?'rgba(255,255,255,.9)':'rgba(255,255,255,.45)');
        if(index>0)g.setLineDash([Math.max(3,cell*.25),Math.max(2,cell*.15)]);
        g.strokeRect(x+1,y+1,sz()*cell-2,sz()*cell-2);g.restore();
      });
    }
    if(hover&&frame===fr()){
      const s=frame.sprites[hover.index];
      if(s){
        const x=(spriteOffsetX(s,hover.index)+hover.x-b.minX)*cell,y=(spriteOffsetY(s,hover.index)+hover.y-b.minY)*cell;
        if(x+cell>=0&&y+cell>=0&&x<=canvas.width&&y<=canvas.height){
          g.save();g.lineWidth=Math.max(2,cell*.12);g.strokeStyle='#fff';g.strokeRect(x+1,y+1,Math.max(1,cell-2),Math.max(1,cell-2));g.restore();
        }
      }
    }
    if(frame===fr())renderSpriteButtons();
    syncCss();
  }

  function schedule(frame=overrideFrame||fr()){
    pendingFrame=frame;if(scheduled)return;
    scheduled=requestAnimationFrame(()=>{scheduled=0;draw(pendingFrame||fr());pendingFrame=null});
  }

  function canvasLogicalPoint(e){
    const r=canvas.getBoundingClientRect(),w=Number(canvas.dataset.gridW),h=Number(canvas.dataset.gridH),parts=String(canvas.dataset.bounds||'').split(',').map(Number);
    if(!r.width||!r.height||!w||!h||parts.length!==4||parts.some(v=>!Number.isFinite(v)))return null;
    if(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return null;
    return{gx:parts[0]+C(Math.floor((e.clientX-r.left)/r.width*w),0,w-1),gy:parts[1]+C(Math.floor((e.clientY-r.top)/r.height*h),0,h-1)};
  }

  function localPointFor(index,p){
    const s=fr().sprites[index];if(!s||!s.visible||!p)return null;
    const x=p.gx-spriteOffsetX(s,index),y=p.gy-spriteOffsetY(s,index),n=sz();
    return x>=0&&y>=0&&x<n&&y<n?{x,y}:null;
  }

  function pointInsideAnySprite(p){
    if(!p)return false;const n=sz();
    return fr().sprites.some((s,index)=>s.visible&&p.gx>=spriteOffsetX(s,index)&&p.gx<spriteOffsetX(s,index)+n&&p.gy>=spriteOffsetY(s,index)&&p.gy<spriteOffsetY(s,index)+n);
  }

  function paintPreviewLine(s,a,b,value){
    let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy,changed=false;
    for(;;){const next=value?1:0;if(s.mask[y0][x0]!==next){s.mask[y0][x0]=next;changed=true}if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}
    return changed;
  }

  function updatePreviewCursor(e){
    if(panning){wrap.style.cursor='grabbing';return}
    const p=canvasLogicalPoint(e);wrap.style.cursor=pointInsideAnySprite(p)?'crosshair':'grab';
  }

  function beginDrawing(e,local){
    if(overrideFrame||$('selectTool')?.classList.contains('on'))return false;
    const s=fr().sprites[S];if(!s||!local)return false;
    e.preventDefault();drawing=true;drawPointerId=e.pointerId;drawErase=e.button===2||tool==='eraser';drawLast=local;drawChanged=paintPreviewLine(s,local,local,!drawErase)||drawChanged;
    wrap.setPointerCapture?.(e.pointerId);schedule(fr());window.redrawEditorLight?.();return true;
  }

  function endPointer(e){
    if(drawing&&e.pointerId===drawPointerId){
      drawing=false;drawPointerId=null;drawLast=null;
      if(drawChanged){drawChanged=false;dirty();render()}else schedule(fr());
      try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){}
      updatePreviewCursor(e);return;
    }
    if(!panning)return;panning=false;wrap.classList.remove('panning');try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){}updatePreviewCursor(e);
  }

  function clearHover(){if(!hover)return;hover=null;schedule(overrideFrame||fr())}

  window.renderCompositePreview=()=>schedule(overrideFrame||fr());
  window.showPreviewFrame=frame=>{overrideFrame=frame;schedule(frame)};
  window.clearPreviewFrame=()=>{overrideFrame=null;schedule(fr())};
  window.redrawPreviewNow=()=>draw(overrideFrame||fr());
  window.setPreviewHover=(index,x,y)=>{const next={index:Number(index)||0,x:C(Math.floor(x),0,sz()-1),y:C(Math.floor(y),0,sz()-1)};if(hover&&hover.index===next.index&&hover.x===next.x&&hover.y===next.y)return;hover=next;schedule(overrideFrame||fr())};
  window.clearPreviewHover=clearHover;
  $('previewZoomIn').onclick=()=>{zoom=C(Math.round((zoom+.1)*10)/10,.1,8);syncCss()};
  $('previewZoomOut').onclick=()=>{zoom=C(Math.round((zoom-.1)*10)/10,.1,8);syncCss()};
  $('previewBorders').onclick=()=>{showBorders=!showBorders;$('previewBorders').classList.toggle('on',showBorders);$('previewBorders').setAttribute('aria-pressed',String(showBorders));schedule(overrideFrame||fr())};
  wrap.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoom=C(Math.round((zoom+(e.deltaY<0 ? .1 : -.1))*10)/10,.1,8);syncCss()},{passive:false});
  wrap.addEventListener('contextmenu',e=>{if(pointInsideAnySprite(canvasLogicalPoint(e)))e.preventDefault()});
  wrap.addEventListener('pointerdown',e=>{
    const p=canvasLogicalPoint(e),local=localPointFor(S,p),insideAny=pointInsideAnySprite(p);
    if((e.button===0||e.button===2)&&local&&beginDrawing(e,local))return;
    if(insideAny){e.preventDefault();return}
    if(e.button!==0)return;
    e.preventDefault();panning=true;pointerStartX=e.clientX;pointerStartY=e.clientY;panStartX=panX;panStartY=panY;wrap.classList.add('panning');wrap.style.cursor='grabbing';wrap.setPointerCapture?.(e.pointerId);
  });
  wrap.addEventListener('pointermove',e=>{
    if(drawing&&e.pointerId===drawPointerId){
      e.preventDefault();const local=localPointFor(S,canvasLogicalPoint(e));
      if(local){const s=fr().sprites[S];if(drawLast)drawChanged=paintPreviewLine(s,drawLast,local,!drawErase)||drawChanged;else drawChanged=paintPreviewLine(s,local,local,!drawErase)||drawChanged;drawLast=local;schedule(fr());window.redrawEditorLight?.()}else drawLast=null;
      return;
    }
    if(panning){e.preventDefault();panX=Math.round(panStartX+e.clientX-pointerStartX);panY=Math.round(panStartY+e.clientY-pointerStartY);syncCss();return}
    updatePreviewCursor(e);
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>wrap.addEventListener(ev,endPointer));
  wrap.addEventListener('dblclick',e=>{if(pointInsideAnySprite(canvasLogicalPoint(e)))return;e.preventDefault();panX=panY=0;syncCss()});
  wrap.addEventListener('pointerleave',()=>{if(!panning&&!drawing)wrap.style.cursor='grab'});
  if(stage){
    stage.addEventListener('pointermove',e=>{
      const c=e.target instanceof HTMLCanvasElement&&e.target.classList.contains('spritecanvas')?e.target:null;if(!c)return;
      const unit=c.closest('.spriteunit');if(!unit)return;
      const r=c.getBoundingClientRect();if(!r.width||!r.height)return;
      const x=C(Math.floor((e.clientX-r.left)/r.width*sz()),0,sz()-1),y=C(Math.floor((e.clientY-r.top)/r.height*sz()),0,sz()-1);
      window.setPreviewHover(Number(unit.dataset.spriteIndex)||0,x,y);
    },true);
    stage.addEventListener('pointerout',e=>{if(e.target instanceof HTMLCanvasElement&&e.target.classList.contains('spritecanvas'))clearHover()},true);
    stage.addEventListener('pointerleave',clearHover,true);
  }
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncCss).observe(wrap);else window.addEventListener('resize',syncCss);
  draw();
})();
