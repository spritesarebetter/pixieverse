'use strict';
(() => {
  const canvas=$('previewCanvas'),wrap=$('previewWrap'),stage=$('editorStage');
  let zoom=1,showBorders=true,overrideFrame=null,scheduled=0,pendingFrame=null,hover=null;
  let panX=0,panY=0,panning=false,panStartX=0,panStartY=0,pointerStartX=0,pointerStartY=0;

  function bounds(frame){
    const n=sz(),boxes=[];
    frame.sprites.forEach((s,index)=>{
      if(!s.visible)return;
      const x=spriteOffsetX(s,index),y=spriteOffsetY(s,index);
      boxes.push({x,y,right:x+n,bottom:y+n});
    });
    if(!boxes.length)return{minX:0,minY:0,maxX:n,maxY:n,w:n,h:n};
    const minX=Math.min(...boxes.map(b=>b.x)),minY=Math.min(...boxes.map(b=>b.y));
    const maxX=Math.max(...boxes.map(b=>b.right)),maxY=Math.max(...boxes.map(b=>b.bottom));
    return{minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
  }

  function compose(frame,b){
    const cells=new Int16Array(b.w*b.h);cells.fill(-1);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)cells[y*b.w+x]=spriteMode2ColorAt(frame,b.minX+x,b.minY+y);
    return cells;
  }

  function fitCell(){
    const h=Number(canvas.dataset.gridH)||sz(),availH=Math.max(24,wrap.clientHeight-12);
    return Math.max(.05,availH/h)*zoom;
  }

  function syncCss(){
    const w=Number(canvas.dataset.gridW)||sz(),h=Number(canvas.dataset.gridH)||sz(),cell=fitCell();
    canvas.style.width=Math.max(1,w*cell)+'px';canvas.style.height=Math.max(1,h*cell)+'px';
    canvas.style.transform='translate3d('+panX+'px,'+panY+'px,0)';
    $('previewZoom').textContent=Math.round(zoom*100)+'%';
  }

  function draw(frame=fr()){
    const b=bounds(frame),cell=Math.max(2,Math.min(16,Math.floor(2048/Math.max(b.w,b.h)))),g=canvas.getContext('2d'),cells=compose(frame,b);
    canvas.dataset.gridW=String(b.w);canvas.dataset.gridH=String(b.h);
    canvas.dataset.bounds=[b.minX,b.minY,b.maxX,b.maxY].join(',');
    canvas.width=b.w*cell;canvas.height=b.h*cell;
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
    g.fillStyle='#171b22';g.fillRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
      const col=cells[y*b.w+x];
      if(col>=0){g.fillStyle=PAL[col];g.fillRect(x*cell,y*cell,cell,cell)}
    }
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;
    for(let x=0;x<=b.w;x++){g.beginPath();g.moveTo(x*cell+.5,0);g.lineTo(x*cell+.5,canvas.height);g.stroke()}
    for(let y=0;y<=b.h;y++){g.beginPath();g.moveTo(0,y*cell+.5);g.lineTo(canvas.width,y*cell+.5);g.stroke()}
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
    syncCss();
  }

  function schedule(frame=overrideFrame||fr()){
    pendingFrame=frame;if(scheduled)return;
    scheduled=requestAnimationFrame(()=>{scheduled=0;draw(pendingFrame||fr());pendingFrame=null});
  }
  function stopPan(e){if(!panning)return;panning=false;wrap.classList.remove('panning');try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){} }
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
  wrap.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();panning=true;pointerStartX=e.clientX;pointerStartY=e.clientY;panStartX=panX;panStartY=panY;wrap.classList.add('panning');wrap.setPointerCapture?.(e.pointerId)});
  wrap.addEventListener('pointermove',e=>{if(!panning)return;e.preventDefault();panX=Math.round(panStartX+e.clientX-pointerStartX);panY=Math.round(panStartY+e.clientY-pointerStartY);syncCss()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>wrap.addEventListener(ev,stopPan));
  wrap.addEventListener('dblclick',e=>{e.preventDefault();panX=panY=0;syncCss()});
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
