'use strict';
(() => {
  const WAIT_MAX=9999,TICK_MS=1000/60,wait=f=>C(Math.round(Number(f?.wait)||6),1,WAIT_MAX);
  let playing=false,playIndex=0,ticksLeft=0,raf=0,last=0,accum=0,dragIndex=-1,speedPercent=100;
  const ox=(s,i)=>i===0?0:Math.round(Number(s?.ox)||0),oy=(s,i)=>i===0?0:Math.round(Number(s?.oy)||0);

  function frameBounds(frame){
    const n=sz();let minX=0,minY=0,maxX=n,maxY=n;
    frame.sprites.forEach((s,i)=>{if(!s.visible)return;const x=ox(s,i),y=oy(s,i);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x+n);maxY=Math.max(maxY,y+n)});
    return{minX,minY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY)};
  }
  function compose(frame,b){
    const cells=new Int16Array(b.w*b.h);cells.fill(-1);const n=sz();
    frame.sprites.forEach((s,i)=>{
      if(!s.visible)return;const bx=ox(s,i)-b.minX,by=oy(s,i)-b.minY;
      for(let y=0;y<n;y++){
        const a=s.lines[y];if(!a.color)continue;
        for(let x=0;x<n;x++){
          if(!s.mask[y][x])continue;const px=bx+x,py=by+y;if(px<0||py<0||px>=b.w||py>=b.h)continue;
          const p=py*b.w+px,cur=cells[p];if(i>0&&a.or){if(cur>=0)cells[p]=(cur|a.color)&15}else if(cur<0)cells[p]=a.color;
        }
      }
    });
    return cells;
  }
  function drawThumbnail(canvas,frame){
    const b=frameBounds(frame),cells=compose(frame,b),src=document.createElement('canvas'),sg=src.getContext('2d');
    src.width=b.w;src.height=b.h;sg.clearRect(0,0,b.w,b.h);
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const col=cells[y*b.w+x];if(col>=0){sg.fillStyle=PAL[col];sg.fillRect(x,y,1,1)}}
    canvas.width=96;canvas.height=44;const g=canvas.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#0b0d11';g.fillRect(0,0,canvas.width,canvas.height);
    const pad=3,scale=Math.min((canvas.width-pad*2)/b.w,(canvas.height-pad*2)/b.h),dw=Math.max(1,b.w*scale),dh=Math.max(1,b.h*scale),dx=(canvas.width-dw)/2,dy=(canvas.height-dh)/2;
    g.drawImage(src,0,0,b.w,b.h,dx,dy,dw,dh);
  }

  function updateSpeedUi(){
    const badge=$('playbackSpeed');if(badge)badge.textContent=speedPercent+'%';
    const slower=$('slowerFrames'),faster=$('fasterFrames');if(slower)slower.disabled=speedPercent<=10;if(faster)faster.disabled=speedPercent>=400;
  }
  function updateButtons(){$('playFrames').disabled=playing;$('stopFrames').disabled=!playing;$('delFrame').disabled=P.frames.length<=1;updateSpeedUi()}
  function changeSpeed(delta){speedPercent=C(speedPercent+delta,10,400);updateSpeedUi();setStatus('Animation speed '+speedPercent+'%')}

  renderFrames=function(){
    const h=$('frames');h.innerHTML='';
    P.frames.forEach((f,i)=>{
      f.wait=wait(f);const d=document.createElement('div');d.className='framebox'+(i===F?' sel':'')+(playing&&i===playIndex?' playing':'');d.draggable=true;d.dataset.index=String(i);
      const head=document.createElement('div');head.className='framehead';const num=document.createElement('span');num.className='framenum';num.textContent=String(i);const name=document.createElement('span');name.className='framename';name.textContent=f.name;name.title=f.name;head.append(num,name);
      const thumb=document.createElement('canvas');thumb.className='framethumb';thumb.setAttribute('aria-label','Frame '+i+' thumbnail');drawThumbnail(thumb,f);
      const w=document.createElement('label');w.className='framewait';w.innerHTML='<span>wait</span><input type="number" min="1" max="'+WAIT_MAX+'" step="1" value="'+f.wait+'">';
      const input=w.querySelector('input');input.onclick=e=>e.stopPropagation();input.onpointerdown=e=>e.stopPropagation();input.onchange=e=>{e.stopPropagation();f.wait=wait({wait:e.target.value});e.target.value=f.wait;dirty();if(playing&&i===playIndex)ticksLeft=f.wait};
      d.append(head,thumb,w);d.onclick=()=>{F=i;S=0;L=0;render()};
      d.ondragstart=e=>{dragIndex=i;d.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));stop(false)};
      d.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';d.classList.add('dragover')};
      d.ondragleave=()=>d.classList.remove('dragover');
      d.ondrop=e=>{e.preventDefault();d.classList.remove('dragover');const from=dragIndex>=0?dragIndex:Number(e.dataTransfer.getData('text/plain')),to=i;if(from===to||from<0||from>=P.frames.length)return;const selected=fr(),moved=P.frames.splice(from,1)[0];P.frames.splice(to,0,moved);F=P.frames.indexOf(selected);dragIndex=-1;dirty();render();setStatus('Frames reordered')};
      d.ondragend=()=>{dragIndex=-1;h.querySelectorAll('.dragging,.dragover').forEach(x=>x.classList.remove('dragging','dragover'))};
      h.appendChild(d);
    });
    updateButtons();
  };

  function showCurrent(){if(typeof showPreviewFrame==='function')showPreviewFrame(P.frames[playIndex]);renderFrames()}
  function tick(){ticksLeft--;if(ticksLeft<=0){playIndex=(playIndex+1)%P.frames.length;ticksLeft=wait(P.frames[playIndex]);showCurrent()}}
  function loop(now){if(!playing)return;if(!last)last=now;accum+=Math.min(250,now-last)*(speedPercent/100);last=now;while(accum>=TICK_MS){tick();accum-=TICK_MS}raf=requestAnimationFrame(loop)}
  function play(){if(playing||!P.frames.length)return;playing=true;playIndex=C(F,0,P.frames.length-1);ticksLeft=wait(P.frames[playIndex]);last=accum=0;showCurrent();updateButtons();raf=requestAnimationFrame(loop);setStatus('Animation playing · '+speedPercent+'%')}
  function stop(redraw=true){if(raf)cancelAnimationFrame(raf);raf=0;playing=false;last=accum=0;if(typeof clearPreviewFrame==='function')clearPreviewFrame();if(redraw){renderFrames();setStatus('Animation stopped')}updateButtons()}

  const baseAdd=$('addFrame').onclick,baseDup=$('dupFrame').onclick,baseDel=$('delFrame').onclick;
  $('addFrame').onclick=()=>{stop(false);baseAdd()};$('dupFrame').onclick=()=>{stop(false);baseDup()};$('delFrame').onclick=()=>{stop(false);baseDel()};
  $('playFrames').onclick=play;$('stopFrames').onclick=()=>stop();
  $('slowerFrames').onclick=()=>changeSpeed(-10);$('fasterFrames').onclick=()=>changeSpeed(10);
  renderFrames();
})();
