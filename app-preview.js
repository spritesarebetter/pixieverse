'use strict';
(() => {
  const canvas=$('previewCanvas'),wrap=$('previewWrap');
  let zoom=1,showBorders=true,overrideFrame=null,scheduled=0,pendingFrame=null;
  let panX=0,panY=0,panning=false,panStartX=0,panStartY=0,pointerStartX=0,pointerStartY=0;
  const signedX=(s,index)=>index===0?0:Math.round(Number(s?.ox)||0);
  const signedY=(s,index)=>index===0?0:Math.round(Number(s?.oy)||0);

  function bounds(frame){
    const n=sz(),cx=n/2,cy=n/2;
    let minX=0,minY=0,maxX=n,maxY=n;
    frame.sprites.forEach((s,index)=>{
      if(index>0&&!s.visible)return;
      const x=signedX(s,index),y=signedY(s,index);
      minX=Math.min(minX,x);minY=Math.min(minY,y);
      maxX=Math.max(maxX,x+n);maxY=Math.max(maxY,y+n);
    });
    const halfW=Math.max(cx-minX,maxX-cx,cx),halfH=Math.max(cy-minY,maxY-cy,cy);
    minX=Math.floor(cx-halfW);maxX=Math.ceil(cx+halfW);
    minY=Math.floor(cy-halfH);maxY=Math.ceil(cy+halfH);
    return{minX,minY,maxX,maxY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }

  function compose(frame,b){
    const cells=new Int16Array(b.w*b.h);cells.fill(-1);const n=sz();
    frame.sprites.forEach((s,index)=>{
      if(!s.visible)return;
      const ox=signedX(s,index)-b.minX,oy=signedY(s,index)-b.minY;
      for(let y=0;y<n;y++){
        const a=s.lines[y];if(s.transparent&&a.color===0)continue;
        for(let x=0;x<n;x++){
          if(!s.mask[y][x])continue;
          const px=ox+x,py=oy+y;
          if(px<0||py<0||px>=b.w||py>=b.h)continue;
          const p=py*b.w+px,cur=cells[p];
          if(index>0&&a.or){if(cur>=0)cells[p]=(cur|a.color)&15}
          else if(cur<0)cells[p]=a.color;
        }
      }
    });
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

  function draw(frame=fr()){
    const b=bounds(frame),cell=Math.max(2,Math.min(16,Math.floor(2048/Math.max(b.w,b.h)))),g=canvas.getContext('2d'),cells=compose(frame,b);
    canvas.dataset.gridW=String(b.w);canvas.dataset.gridH=String(b.h);
    canvas.width=b.w*cell;canvas.height=b.h*cell;
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
        const x=(signedX(s,index)-b.minX)*cell,y=(signedY(s,index)-b.minY)*cell;
        g.save();g.lineWidth=2;
        g.strokeStyle=index===0?'rgba(101,215,192,.9)':(frame===fr()&&index===S?'rgba(255,255,255,.9)':'rgba(255,255,255,.45)');
        if(index>0)g.setLineDash([Math.max(3,cell*.25),Math.max(2,cell*.15)]);
        g.strokeRect(x+1,y+1,sz()*cell-2,sz()*cell-2);g.restore();
      });
    }
    syncCss();
  }

  function schedule(frame=overrideFrame||fr()){
    pendingFrame=frame;if(scheduled)return;
    scheduled=requestAnimationFrame(()=>{scheduled=0;draw(pendingFrame||fr());pendingFrame=null});
  }
  function stopPan(e){if(!panning)return;panning=false;wrap.classList.remove('panning');try{wrap.releasePointerCapture?.(e.pointerId)}catch(_){} }

  window.renderCompositePreview=()=>schedule(overrideFrame||fr());
  window.showPreviewFrame=frame=>{overrideFrame=frame;schedule(frame)};
  window.clearPreviewFrame=()=>{overrideFrame=null;schedule(fr())};
  window.redrawPreviewNow=()=>draw(overrideFrame||fr());
  $('previewZoomIn').onclick=()=>{zoom=C(Math.round((zoom+.1)*10)/10,.1,8);syncCss()};
  $('previewZoomOut').onclick=()=>{zoom=C(Math.round((zoom-.1)*10)/10,.1,8);syncCss()};
  $('previewBorders').onclick=()=>{showBorders=!showBorders;$('previewBorders').classList.toggle('on',showBorders);$('previewBorders').setAttribute('aria-pressed',String(showBorders));schedule(overrideFrame||fr())};
  wrap.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();zoom=C(Math.round((zoom+(e.deltaY<0 ? .1 : -.1))*10)/10,.1,8);syncCss()},{passive:false});
  wrap.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();panning=true;pointerStartX=e.clientX;pointerStartY=e.clientY;panStartX=panX;panStartY=panY;wrap.classList.add('panning');wrap.setPointerCapture?.(e.pointerId)});
  wrap.addEventListener('pointermove',e=>{if(!panning)return;e.preventDefault();panX=Math.round(panStartX+e.clientX-pointerStartX);panY=Math.round(panStartY+e.clientY-pointerStartY);syncCss()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>wrap.addEventListener(ev,stopPan));
  wrap.addEventListener('dblclick',e=>{e.preventDefault();panX=panY=0;syncCss()});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncCss).observe(wrap);else window.addEventListener('resize',syncCss);
  draw();
})();
