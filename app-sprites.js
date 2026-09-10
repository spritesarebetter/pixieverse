'use strict';
(() => {
  const stage=$('editorStage'),editor=$('editor'),selectedRail=$('spriteColorRail'),editorWrap=$('editorWrap');
  let activeCanvas=null,activeSprite=null,lastPoint=null,eraseStroke=false,strokeChanged=false,lastTapAt=0,lastTapKey='',fitRaf=0,manualZoom=false;
  const DOUBLE_TAP_MS=320;

  layerPoint=p=>p;
  lineTable=function(){L=C(L,0,sz()-1)};
  const dpr=()=>Math.max(1,Number(window.devicePixelRatio)||1);
  const requestedCssCell=()=>Math.max(1,EDITOR_BASE_CELL*editorZoom);
  const cssCell=()=>Math.max(1,Math.round(requestedCssCell()*dpr())/dpr());
  const backingCell=()=>Math.max(1,Math.round(cssCell()*dpr()));
  const cssSize=()=>sz()*cssCell();
  const railWidth=(cell,base)=>Math.max(base?34:48,cell*(base?1.15:2.05));
  const maxPattern=()=>sz()===16?63:255;

  function syncAllSpriteScales(){
    const cell=cssCell(),size=cssSize(),uiScale=C(editorZoom*1.5,.65,1.5);
    stage.style.setProperty('--editor-cell',cell+'px');
    stage.style.setProperty('--sprite-ui-scale',String(uiScale));
    stage.style.gap=cell+'px';
    stage.querySelectorAll('.spriteunit').forEach(unit=>{
      const index=Number(unit.dataset.spriteIndex)||0,s=fr().sprites[index],base=s&&spritePriority(s,index)===0,total=size+railWidth(cell,base);
      unit.style.width=total+'px';
      unit.style.setProperty('--sprite-unit-width',total+'px');
    });
    stage.querySelectorAll('.spritecanvas').forEach(c=>{
      c.style.width=size+'px';
      c.style.height=size+'px';
      c.style.minWidth=size+'px';
      c.style.minHeight=size+'px';
      c.style.imageRendering='pixelated';
    });
    stage.querySelectorAll('.spritecolorrail').forEach(r=>{
      r.style.width=railWidth(cell,r.classList.contains('base'))+'px';
      r.style.height=size+'px';
      const rows=r.querySelector('.spriterows');if(rows)rows.style.height=size+'px';
    });
  }
  window.syncAllSpriteScales=syncAllSpriteScales;
  const baseApply=applyEditorScale;
  applyEditorScale=function(){baseApply();syncAllSpriteScales();$('editorZoom').textContent=Math.round(editorZoom*100)+'%'};
  const baseChangeEditorZoom=changeEditorZoom;
  changeEditorZoom=function(delta){
    manualZoom=true;
    if(fitRaf)cancelAnimationFrame(fitRaf);
    fitRaf=0;
    baseChangeEditorZoom(delta);
  };

  function fitObjectEditorSprites(iterations=4,force=false){
    if(manualZoom&&!force)return;
    if(fitRaf)cancelAnimationFrame(fitRaf);
    const run=()=>{
      fitRaf=0;
      if(manualZoom&&!force)return;
      const unit=stage.querySelector('.spriteunit');if(!unit||!editorWrap)return;
      const availableW=Math.max(100,editorWrap.clientWidth-18),availableH=Math.max(80,editorWrap.clientHeight-18),rect=stage.getBoundingClientRect(),currentW=rect.width,currentH=rect.height;
      if(currentW>0&&currentH>0){
        const ratio=Math.min(availableW/currentW,availableH/currentH);
        if(Math.abs(ratio-1)>.015){
          editorZoom=C(editorZoom*ratio,.1,8);
          baseApply();syncAllSpriteScales();
        }
      }
      if(--iterations>0)fitRaf=requestAnimationFrame(run);
    };
    fitRaf=requestAnimationFrame(run);
  }
  window.fitObjectEditorSprites=fitObjectEditorSprites;
  window.resetObjectEditorFit=()=>{manualZoom=false;fitObjectEditorSprites(4,true)};

  function drawSprite(c,s,line=-1){
    const n=sz(),scale=backingCell(),g=c.getContext('2d');
    c.width=n*scale;c.height=n*scale;editorCell=scale;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.clearRect(0,0,c.width,c.height);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const a=s.lines[y],col=s.mask[y][x]?a.color:0;
      g.fillStyle=PAL[col];
      g.fillRect(x*scale,y*scale,scale,scale);
    }
    g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=1;
    for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}
    for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}
    if(line>=0){g.strokeStyle='rgba(101,215,192,.65)';g.strokeRect(1.5,line*scale+1.5,n*scale-3,Math.max(1,scale-3))}
  }
  function pointFor(c,e){
    const r=c.getBoundingClientRect();
    if(!r.width||!r.height||e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return null;
    return{x:Math.floor((e.clientX-r.left)/r.width*sz()),y:Math.floor((e.clientY-r.top)/r.height*sz())};
  }
  function paintLine(s,a,b,v){let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy;for(;;){const colored=v&&K!==0;s.mask[y0][x0]=colored?1:0;if(colored)s.lines[y0].color=K;if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}}
  function lightRedraw(){drawSprite(editor,layer(),L);if(typeof renderCompositePreview==='function')renderCompositePreview()}
  window.redrawEditorLight=lightRedraw;
  window.syncSelectedPatternPeers=()=>{const source=layer();fr().sprites.forEach((peer,i)=>{if(i!==S&&peer.pattern===source.pattern)peer.mask=clone(source.mask)})};

  function selectSprite(index,line=0){S=C(index,0,fr().sprites.length-1);L=C(line,0,sz()-1);render()}
  function setPattern(index,value){
    const s=fr().sprites[index];if(!s)return;const next=C(Math.round(Number(value)||0),0,maxPattern()),existing=fr().sprites.find((peer,i)=>i!==index&&peer.pattern===next);
    s.pattern=next;if(existing)s.mask=clone(existing.mask);S=index;dirty();render();
  }
  function nudgePattern(index,input,delta){
    input.value=String(C(Math.round(Number(input.value)||0)+delta,0,maxPattern()));
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function changePriority(index,delta){
    const s=fr().sprites[index];if(!s)return;
    const next=spritePriority(s,index)+delta;
    if(setSpritePriority(fr(),index,next)){S=index;dirty();render();setStatus('Sprite #'+index+' priority '+spritePriority(fr().sprites[index],index))}
  }
  function setOffset(index,axis,value){if(index===0)return;const s=fr().sprites[index];if(!s)return;s[axis]=Math.round(Number(value)||0);S=index;dirty();render()}
  function moveOffset(index,dx,dy){if(index===0)return;const s=fr().sprites[index];if(!s)return;s.ox=Math.round(Number(s.ox)||0)+dx;s.oy=Math.round(Number(s.oy)||0)+dy;S=index;dirty();render()}
  function setVisible(index,value){const s=fr().sprites[index];if(!s)return;s.visible=!!value;S=index;dirty();render()}
  function setTransparency(index,value){const s=fr().sprites[index];if(!s)return;s.transparent=!!value;S=index;dirty();render()}

  function buildHeader(index,s){
    const origin=index===0,priority=spritePriority(s,index),head=document.createElement('div');head.className='spriteunithead';
    const top=document.createElement('div');top.className='spriteunitheadrow spriteunitidentity';
    const select=document.createElement('button');select.type='button';select.className='spriteselect'+(index===S?' on':'');select.textContent='Sprite #'+index;select.title=origin?'Sprite #0 · object origin':'Select Sprite #'+index;select.onclick=e=>{e.stopPropagation();selectSprite(index,L)};
    const priorityControl=document.createElement('div');priorityControl.className='spritepriority';
    const priorityValue=document.createElement('span');priorityValue.className='spritepriorityvalue';priorityValue.textContent='Priority '+priority;priorityValue.title='Priority 0 is the bottom layer; higher numbers are drawn on top';
    const priorityMinus=document.createElement('button');priorityMinus.type='button';priorityMinus.className='patternstep prioritystep';priorityMinus.textContent='−';priorityMinus.title='Lower priority';priorityMinus.disabled=priority<=0;priorityMinus.onclick=e=>{e.stopPropagation();changePriority(index,-1)};
    const priorityPlus=document.createElement('button');priorityPlus.type='button';priorityPlus.className='patternstep prioritystep';priorityPlus.textContent='+';priorityPlus.title='Higher priority';priorityPlus.disabled=priority>=fr().sprites.length-1;priorityPlus.onclick=e=>{e.stopPropagation();changePriority(index,1)};
    priorityControl.append(priorityValue,priorityMinus,priorityPlus);
    const pattern=document.createElement('div');pattern.className='spritepattern';const patternLabel=document.createElement('span');patternLabel.textContent='Pattern';
    const patternInput=document.createElement('input');patternInput.type='number';patternInput.min='0';patternInput.max=String(maxPattern());patternInput.step='1';patternInput.value=String(s.pattern);patternInput.title='Pattern number';patternInput.onclick=e=>e.stopPropagation();patternInput.onpointerdown=e=>e.stopPropagation();patternInput.onchange=e=>{e.stopPropagation();setPattern(index,e.target.value)};
    const patternMinus=document.createElement('button');patternMinus.type='button';patternMinus.className='patternstep';patternMinus.textContent='−';patternMinus.title='Previous pattern';patternMinus.disabled=s.pattern<=0;patternMinus.onclick=e=>{e.stopPropagation();nudgePattern(index,patternInput,-1)};
    const patternPlus=document.createElement('button');patternPlus.type='button';patternPlus.className='patternstep';patternPlus.textContent='+';patternPlus.title='Next pattern';patternPlus.disabled=s.pattern>=maxPattern();patternPlus.onclick=e=>{e.stopPropagation();nudgePattern(index,patternInput,1)};
    pattern.append(patternLabel,patternInput,patternMinus,patternPlus);
    const visible=document.createElement('label');visible.className='spritevisiblemini';visible.title='Sprite visible';const vis=document.createElement('input');vis.type='checkbox';vis.checked=s.visible;vis.onclick=e=>e.stopPropagation();vis.onchange=e=>{e.stopPropagation();setVisible(index,e.target.checked)};visible.append(vis,document.createTextNode(' visible'));
    const transparent=document.createElement('label');transparent.className='spritevisiblemini spritetransparency';transparent.title='When enabled, Color 0 is transparent';const tr=document.createElement('input');tr.type='checkbox';tr.checked=!!s.transparent;tr.onclick=e=>e.stopPropagation();tr.onchange=e=>{e.stopPropagation();setTransparency(index,e.target.checked)};transparent.append(tr,document.createTextNode(' transparency'));
    top.append(select,priorityControl,pattern,visible,transparent);

    const pos=document.createElement('div');pos.className='spriteunitheadrow spriteoffsetrow';
    const x=document.createElement('label');x.className='spriteoffsetfield';x.innerHTML='<span>X</span>';const xi=document.createElement('input');xi.type='number';xi.value=String(origin?0:s.ox);xi.disabled=origin;xi.title=origin?'Sprite #0 is the origin':'X offset relative to Sprite #0';xi.onclick=e=>e.stopPropagation();xi.onpointerdown=e=>e.stopPropagation();xi.onchange=e=>{e.stopPropagation();setOffset(index,'ox',e.target.value)};x.appendChild(xi);
    const y=document.createElement('label');y.className='spriteoffsetfield';y.innerHTML='<span>Y</span>';const yi=document.createElement('input');yi.type='number';yi.value=String(origin?0:s.oy);yi.disabled=origin;yi.title=origin?'Sprite #0 is the origin':'Y offset relative to Sprite #0';yi.onclick=e=>e.stopPropagation();yi.onpointerdown=e=>e.stopPropagation();yi.onchange=e=>{e.stopPropagation();setOffset(index,'oy',e.target.value)};y.appendChild(yi);
    pos.append(x,y);
    [['←',-1,0],['→',1,0],['↑',0,-1],['↓',0,1]].forEach(([label,dx,dy])=>{const b=document.createElement('button');b.type='button';b.className='spriteoffsetbutton';b.textContent=label;b.disabled=origin;b.title=origin?'Sprite #0 is fixed':'Move sprite offset';b.onclick=e=>{e.stopPropagation();moveOffset(index,dx,dy)};pos.appendChild(b)});
    head.append(top,pos);return head;
  }

  function buildRail(rail,s,index,selected){
    const base=spritePriority(s,index)===0;rail.className='spritecolorrail'+(base?' base':'');rail.innerHTML='';
    const labels=document.createElement('div');labels.className='colorlabels';labels.innerHTML=base?'<span>Line color</span>':'<span>Line color</span><span>OR</span>';
    const rows=document.createElement('div');rows.className='spriterows';if(selected)rows.id='lines';rail.append(labels,rows);
    for(let y=0;y<sz();y++){
      const a=s.lines[y],r=document.createElement('div');r.className='colorrow'+(base?' basecolorrow':'')+(selected&&y===L?' sel':'');
      const sw=document.createElement('button');sw.className='linecolorswatch';sw.style.background=PAL[a.color];sw.title='Set line '+y+' color to selected Color '+K+'; all other pixels on the line are Color 0';sw.onclick=e=>{e.stopPropagation();S=index;L=y;a.color=K;dirty();render()};r.appendChild(sw);
      if(!base){const or=document.createElement('input');or.type='checkbox';or.className='orbox';or.checked=!!a.or;or.title='OR / combine color with lower-priority sprite';or.onclick=e=>e.stopPropagation();or.onchange=()=>{S=index;L=y;a.or=or.checked;dirty();render()};r.appendChild(or)}
      r.onclick=()=>{S=index;L=y;render()};rows.appendChild(r);
    }
  }

  function startStroke(c,index,s,e){
    if($('selectTool').classList.contains('on')){if(index!==S){e.preventDefault();e.stopImmediatePropagation();S=index;L=0;render()}return false}
    if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return false;
    const p=pointFor(c,e);if(!p)return false;
    e.preventDefault();e.stopImmediatePropagation();S=index;const now=performance.now(),key=index+':'+p.x+','+p.y;
    if(e.button===0&&now-lastTapAt<=DOUBLE_TAP_MS&&key===lastTapKey){s.mask[p.y][p.x]=0;L=p.y;lastTapAt=0;lastTapKey='';dirty();render();return true}
    lastTapAt=now;lastTapKey=key;activeCanvas=c;activeSprite=s;lastPoint=p;eraseStroke=e.button===2||tool==='eraser';strokeChanged=true;L=p.y;paintLine(s,p,p,eraseStroke?0:1);c.setPointerCapture?.(e.pointerId);drawSprite(c,s,L);if(typeof renderCompositePreview==='function')renderCompositePreview();return true;
  }
  function moveStroke(c,e){
    if(activeCanvas!==c||!activeSprite)return false;
    e.preventDefault();e.stopImmediatePropagation();const p=pointFor(c,e);
    if(!p){lastPoint=null;return true}
    if(lastPoint)paintLine(activeSprite,lastPoint,p,eraseStroke?0:1);else paintLine(activeSprite,p,p,eraseStroke?0:1);
    lastPoint=p;L=p.y;drawSprite(c,activeSprite,L);if(typeof renderCompositePreview==='function')renderCompositePreview();return true;
  }
  function endStroke(c,e){if(activeCanvas!==c)return false;e?.preventDefault?.();e?.stopImmediatePropagation?.();activeCanvas=null;activeSprite=null;lastPoint=null;if(strokeChanged){strokeChanged=false;dirty();render()}return true}
  function wireSelected(){
    if(editor.dataset.stableWired)return;editor.dataset.stableWired='1';editor.oncontextmenu=e=>e.preventDefault();
    editor.addEventListener('pointerdown',e=>startStroke(editor,S,layer(),e),true);editor.addEventListener('pointermove',e=>moveStroke(editor,e),true);
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>editor.addEventListener(ev,e=>endStroke(editor,e),true));
  }
  function wireTemporary(c,index,s){
    c.oncontextmenu=e=>e.preventDefault();c.title='Sprite #'+index+' · click to select/edit';
    c.addEventListener('pointerdown',e=>startStroke(c,index,s,e),true);c.addEventListener('pointermove',e=>moveStroke(c,e),true);
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>c.addEventListener(ev,e=>endStroke(c,e),true));
  }
  function makeUnit(index,s){
    const unit=document.createElement('div');unit.className='spriteunit'+(index===S?' selected':'');unit.dataset.spriteIndex=String(index);
    const head=buildHeader(index,s),body=document.createElement('div');body.className='spritebody';
    if(index===S){editor.className='artboardshadow spritecanvas';editor.title='Sprite #'+index;buildRail(selectedRail,s,index,true);body.append(editor,selectedRail);drawSprite(editor,s,L);wireSelected()}
    else{const c=document.createElement('canvas');c.className='artboardshadow spritecanvas';drawSprite(c,s,-1);wireTemporary(c,index,s);const rail=document.createElement('div');buildRail(rail,s,index,false);body.append(c,rail)}
    unit.append(head,body);return unit;
  }

  drawEditor=function(){editor.remove();selectedRail.remove();stage.innerHTML='';fr().sprites.forEach((s,i)=>stage.appendChild(makeUnit(i,s)));syncAllSpriteScales();fitObjectEditorSprites();if(typeof renderCompositePreview==='function')renderCompositePreview()};
  if(typeof ResizeObserver!=='undefined'&&editorWrap)new ResizeObserver(()=>fitObjectEditorSprites()).observe(editorWrap);
  render();
})();