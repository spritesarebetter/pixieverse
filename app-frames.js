'use strict';
(() => {
  const WAIT_MAX=9999,TICK_MS=1000/60,wait=f=>C(Math.round(Number(f?.wait)||6),1,WAIT_MAX);
  let animationCanvas=null,animationWrap=null;
  let playing=false,playIndex=0,ticksLeft=0,raf=0,last=0,accum=0,dragIndex=-1,speedPercent=100;
  const ox=(s,i)=>spriteOffsetX(s,i),oy=(s,i)=>spriteOffsetY(s,i),frameNumber=i=>String(i).padStart(2,'0');

  function ensureAnimationPreview(){
    const timeline=document.querySelector('.timelinepanel');if(!timeline)return;
    let row=timeline.parentElement?.classList.contains('animationrow')?timeline.parentElement:null;
    if(!row){row=document.createElement('div');row.className='animationrow';timeline.parentNode.insertBefore(row,timeline);row.appendChild(timeline)}
    let panel=row.querySelector('.animationpreviewpanel');
    if(!panel){panel=document.createElement('section');panel.className='panel animationpreviewpanel';panel.setAttribute('aria-label','Animation preview');panel.innerHTML='<div class="sectionhead"><h2>Animation preview</h2></div><div id="animationPreviewWrap" class="animationpreviewwrap"><canvas id="animationPreviewCanvas" class="animationpreviewcanvas" width="256" height="144" aria-label="Animation preview"></canvas></div>';row.appendChild(panel)}
    animationCanvas=$('animationPreviewCanvas');animationWrap=$('animationPreviewWrap');
  }
  ensureAnimationPreview();

  function frameBounds(frame){const n=sz();let minX=0,minY=0,maxX=n,maxY=n;frame.sprites.forEach((s,i)=>{if(!s.visible)return;const x=ox(s,i),y=oy(s,i);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+n);maxY=Math.max(maxY,y+n)});return{minX,minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)}}
  function compose(frame,b){const cells=new Int16Array(b.w*b.h);cells.fill(-1);for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++)cells[y*b.w+x]=spriteMode2ColorAt(frame,b.minX+x,b.minY+y);return cells}
  function drawFrameInto(canvas,frame,width,height){
    if(!canvas||!frame)return;const b=frameBounds(frame),cells=compose(frame,b),src=document.createElement('canvas'),sg=src.getContext('2d');src.width=b.w;src.height=b.h;sg.clearRect(0,0,b.w,b.h);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const col=cells[y*b.w+x];if(col>=0){sg.fillStyle=PAL[col];sg.fillRect(x,y,1,1)}}
    canvas.width=width;canvas.height=height;const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#0b0d11';g.fillRect(0,0,width,height);const pad=4,scale=Math.max(.01,Math.min((width-pad*2)/b.w,(height-pad*2)/b.h)),dw=Math.max(1,b.w*scale),dh=Math.max(1,b.h*scale),dx=(width-dw)/2,dy=(height-dh)/2;g.drawImage(src,0,0,b.w,b.h,dx,dy,dw,dh);
  }
  function drawThumbnail(canvas,frame){drawFrameInto(canvas,frame,96,44)}
  function drawAnimationPreview(frame){if(!animationCanvas)ensureAnimationPreview();drawFrameInto(animationCanvas,frame,256,144);if(animationCanvas)animationCanvas.setAttribute('aria-label','Animation preview · '+String(frame?.name||''))}
  window.redrawAnimationPreview=()=>drawAnimationPreview(playing?P.frames[playIndex]:fr());

  function updateSpeedUi(){const badge=$('playbackSpeed');if(badge)badge.textContent=speedPercent+'%';const slower=$('slowerFrames'),faster=$('fasterFrames');if(slower)slower.disabled=speedPercent<=10;if(faster)faster.disabled=speedPercent>=400}
  function updateButtons(){$('playFrames').disabled=playing;$('stopFrames').disabled=!playing;$('delFrame').disabled=P.frames.length<=1;updateSpeedUi()}
  function changeSpeed(delta){speedPercent=C(speedPercent+delta,10,400);updateSpeedUi();setStatus('Animation speed '+speedPercent+'%')}

  function wireFrameName(name,f,i){
    let original=f.name,cancel=false;
    name.classList.add('editable');name.title='Click to rename frame '+frameNumber(i);name.draggable=false;
    name.onpointerdown=e=>e.stopPropagation();
    name.onclick=e=>{
      e.stopPropagation();
      if(name.isContentEditable)return;
      original=f.name;cancel=false;name.contentEditable='true';name.classList.add('editing');name.focus();
      const sel=window.getSelection?.(),range=document.createRange?.();if(sel&&range){range.selectNodeContents(name);sel.removeAllRanges();sel.addRange(range)}
    };
    name.onkeydown=e=>{
      if(e.key==='Enter'){e.preventDefault();name.blur()}
      else if(e.key==='Escape'){e.preventDefault();cancel=true;name.textContent=original;name.blur()}
    };
    name.onblur=()=>{
      if(!name.isContentEditable)return;
      const next=cancel?original:(name.textContent.trim()||('Frame '+i));
      name.contentEditable='false';name.classList.remove('editing');cancel=false;
      if(next!==f.name){f.name=next;dirty();setStatus('Frame '+frameNumber(i)+' renamed')}
      name.textContent=f.name;name.title='Click to rename frame '+frameNumber(i);
      if(!playing)drawAnimationPreview(fr());
    };
  }

  renderFrames=function(){
    const h=$('frames');h.innerHTML='';
    P.frames.forEach((f,i)=>{
      f.wait=wait(f);const d=document.createElement('div');d.className='framebox'+(i===F?' sel':'')+(playing&&i===playIndex?' playing':'');d.draggable=true;d.dataset.index=String(i);
      const head=document.createElement('div');head.className='framehead';const num=document.createElement('span');num.className='framenum';num.textContent=frameNumber(i);num.title='Frame number';const name=document.createElement('span');name.className='framename';name.textContent=f.name;wireFrameName(name,f,i);head.append(num,name);
      const thumb=document.createElement('canvas');thumb.className='framethumb';thumb.setAttribute('aria-label','Frame '+frameNumber(i)+' thumbnail');drawThumbnail(thumb,f);
      const w=document.createElement('label');w.className='framewait';w.innerHTML='<span>wait</span><input type="number" min="1" max="'+WAIT_MAX+'" step="1" value="'+f.wait+'">';const input=w.querySelector('input');input.onclick=e=>e.stopPropagation();input.onpointerdown=e=>e.stopPropagation();input.onchange=e=>{e.stopPropagation();f.wait=wait({wait:e.target.value});e.target.value=f.wait;dirty();if(playing&&i===playIndex)ticksLeft=f.wait};
      d.append(head,thumb,w);d.onclick=()=>{F=i;S=0;L=0;render();if(!playing)drawAnimationPreview(fr())};d.ondragstart=e=>{dragIndex=i;d.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));stop(false)};d.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';d.classList.add('dragover')};d.ondragleave=()=>d.classList.remove('dragover');d.ondrop=e=>{e.preventDefault();d.classList.remove('dragover');const from=dragIndex>=0?dragIndex:Number(e.dataTransfer.getData('text/plain')),to=i;if(from===to||from<0||from>=P.frames.length)return;const selected=fr(),moved=P.frames.splice(from,1)[0];P.frames.splice(to,0,moved);F=P.frames.indexOf(selected);dragIndex=-1;dirty();render();setStatus('Frames reordered')};d.ondragend=()=>{dragIndex=-1;h.querySelectorAll('.dragging,.dragover').forEach(x=>x.classList.remove('dragging','dragover'))};h.appendChild(d);
    });
    updateButtons();if(!playing)drawAnimationPreview(fr());
  };

  function showCurrent(){drawAnimationPreview(P.frames[playIndex]);renderFrames()}
  function tick(){ticksLeft--;if(ticksLeft<=0){playIndex=(playIndex+1)%P.frames.length;ticksLeft=wait(P.frames[playIndex]);showCurrent()}}
  function loop(now){if(!playing)return;if(!last)last=now;accum+=Math.min(250,now-last)*(speedPercent/100);last=now;while(accum>=TICK_MS){tick();accum-=TICK_MS}raf=requestAnimationFrame(loop)}
  function play(){if(playing||!P.frames.length)return;playing=true;playIndex=C(F,0,P.frames.length-1);ticksLeft=wait(P.frames[playIndex]);last=accum=0;showCurrent();updateButtons();raf=requestAnimationFrame(loop);setStatus('Animation playing · '+speedPercent+'%')}
  function stop(redraw=true){if(raf)cancelAnimationFrame(raf);raf=0;playing=false;last=accum=0;drawAnimationPreview(fr());if(redraw){renderFrames();setStatus('Animation stopped')}updateButtons()}

  const baseAdd=$('addFrame').onclick,baseDup=$('dupFrame').onclick,baseDel=$('delFrame').onclick;$('addFrame').onclick=()=>{stop(false);baseAdd();drawAnimationPreview(fr())};$('dupFrame').onclick=()=>{stop(false);baseDup();drawAnimationPreview(fr())};$('delFrame').onclick=()=>{stop(false);baseDel();drawAnimationPreview(fr())};$('playFrames').onclick=play;$('stopFrames').onclick=()=>stop();$('slowerFrames').onclick=()=>changeSpeed(-10);$('fasterFrames').onclick=()=>changeSpeed(10);
  if(typeof ResizeObserver!=='undefined'&&animationWrap)new ResizeObserver(()=>drawAnimationPreview(playing?P.frames[playIndex]:fr())).observe(animationWrap);
  renderFrames();
})();