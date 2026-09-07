'use strict';
(() => {
  const stage=$('editorStage'),editor=$('editor'),selectedRail=$('spriteColorRail');
  let activeCanvas=null,activeSprite=null,lastPoint=null,eraseStroke=false,strokeChanged=false,lastTapAt=0,lastTapKey='';
  const DOUBLE_TAP_MS=320;

  layerPoint=p=>p;
  lineTable=function(){L=C(L,0,sz()-1)};
  const cssSize=()=>sz()*EDITOR_BASE_CELL*editorZoom;
  const railWidth=(cell,base)=>Math.max(base?34:48,cell*(base?1.15:2.05));

  function syncAllSpriteScales(){
    const cell=EDITOR_BASE_CELL*editorZoom,size=cssSize();stage.style.setProperty('--editor-cell',cell+'px');stage.style.gap=cell+'px';
    stage.querySelectorAll('.spritecanvas').forEach(c=>{c.style.width=size+'px';c.style.height=size+'px';c.style.minWidth=size+'px';c.style.minHeight=size+'px'});
    stage.querySelectorAll('.spritecolorrail').forEach(r=>{r.style.width=railWidth(cell,r.classList.contains('base'))+'px';r.style.height=size+'px';const rows=r.querySelector('.spriterows');if(rows)rows.style.height=size+'px'});
  }
  window.syncAllSpriteScales=syncAllSpriteScales;
  const baseApply=applyEditorScale;
  applyEditorScale=function(){baseApply();syncAllSpriteScales();$('editorZoom').textContent=Math.round(editorZoom*100)+'%'};

  function drawSprite(c,s,line=-1){
    const n=sz(),scale=editorRenderScale(),g=c.getContext('2d');c.width=n*scale;c.height=n*scale;editorCell=scale;
    g.fillStyle='#171b22';g.fillRect(0,0,c.width,c.height);
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(s.mask[y][x]&&s.lines[y].color){g.fillStyle=PAL[s.lines[y].color];g.fillRect(x*scale+1,y*scale+1,scale-2,scale-2)}}
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}
    if(line>=0){g.strokeStyle='rgba(101,215,192,.65)';g.strokeRect(2,line*scale+2,n*scale-4,scale-4)}
  }
  function pointFor(c,e){const r=c.getBoundingClientRect();return{x:C(Math.floor((e.clientX-r.left)/r.width*sz()),0,sz()-1),y:C(Math.floor((e.clientY-r.top)/r.height*sz()),0,sz()-1)}}
  function paintLine(s,a,b,v){let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy;for(;;){s.mask[y0][x0]=v;if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}}
  function lightRedraw(){drawSprite(editor,layer(),L);if(typeof renderCompositePreview==='function')renderCompositePreview()}
  window.redrawEditorLight=lightRedraw;

  function buildRail(rail,s,index,selected){
    const base=index===0;rail.className='spritecolorrail'+(base?' base':'');rail.innerHTML='';
    const labels=document.createElement('div');labels.className='colorlabels';labels.innerHTML=base?'<span>Color</span>':'<span>Color</span><span>OR</span>';
    const rows=document.createElement('div');rows.className='spriterows';if(selected)rows.id='lines';rail.append(labels,rows);
    for(let y=0;y<sz();y++){
      const a=s.lines[y],r=document.createElement('div');r.className='colorrow'+(base?' basecolorrow':'')+(selected&&y===L?' sel':'');
      const sw=document.createElement('button');sw.className='linecolorswatch';sw.style.background=PAL[a.color];sw.title='Color '+String(a.color).padStart(2,'0');sw.onclick=e=>{e.stopPropagation();S=index;L=y;K=a.color;render()};r.appendChild(sw);
      if(!base){const or=document.createElement('input');or.type='checkbox';or.className='orbox';or.checked=!!a.or;or.title='OR / combine color';or.onclick=e=>e.stopPropagation();or.onchange=()=>{S=index;L=y;a.or=or.checked;dirty();render()};r.appendChild(or)}
      r.onclick=()=>{S=index;L=y;K=a.color;render()};rows.appendChild(r);
    }
  }

  function startStroke(c,index,s,e){
    if($('selectTool').classList.contains('on')){if(index!==S){e.preventDefault();e.stopImmediatePropagation();S=index;L=0;render()}return false}
    if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return false;
    e.preventDefault();e.stopImmediatePropagation();S=index;const p=pointFor(c,e),now=performance.now(),key=index+':'+p.x+','+p.y;
    if(e.button===0&&now-lastTapAt<=DOUBLE_TAP_MS&&key===lastTapKey){s.mask[p.y][p.x]=0;L=p.y;lastTapAt=0;lastTapKey='';dirty();render();return true}
    lastTapAt=now;lastTapKey=key;activeCanvas=c;activeSprite=s;lastPoint=p;eraseStroke=e.button===2||tool==='eraser';strokeChanged=true;L=p.y;paintLine(s,p,p,eraseStroke?0:1);c.setPointerCapture?.(e.pointerId);drawSprite(c,s,L);if(typeof renderCompositePreview==='function')renderCompositePreview();return true;
  }
  function moveStroke(c,e){if(activeCanvas!==c||!activeSprite)return false;e.preventDefault();e.stopImmediatePropagation();const p=pointFor(c,e);paintLine(activeSprite,lastPoint,p,eraseStroke?0:1);lastPoint=p;L=p.y;drawSprite(c,activeSprite,L);if(typeof renderCompositePreview==='function')renderCompositePreview();return true}
  function endStroke(c,e){if(activeCanvas!==c)return false;e?.preventDefault?.();e?.stopImmediatePropagation?.();activeCanvas=null;activeSprite=null;lastPoint=null;if(strokeChanged){strokeChanged=false;dirty();render()}return true}
  function wireSelected(){
    if(editor.dataset.stableWired)return;editor.dataset.stableWired='1';editor.oncontextmenu=e=>e.preventDefault();
    editor.addEventListener('pointerdown',e=>startStroke(editor,S,layer(),e),true);editor.addEventListener('pointermove',e=>moveStroke(editor,e),true);
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>editor.addEventListener(ev,e=>endStroke(editor,e),true));
  }
  function wireTemporary(c,index,s){
    c.oncontextmenu=e=>e.preventDefault();c.title=s.name+' · click to select/edit';
    c.addEventListener('pointerdown',e=>startStroke(c,index,s,e),true);c.addEventListener('pointermove',e=>moveStroke(c,e),true);
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>c.addEventListener(ev,e=>endStroke(c,e),true));
  }
  function makeUnit(index,s){
    const unit=document.createElement('div');unit.className='spriteunit'+(index===S?' selected':'');const title=document.createElement('div');title.className='spritetitle';title.textContent=s.name;title.title=s.name;const body=document.createElement('div');body.className='spritebody';
    if(index===S){editor.className='artboardshadow spritecanvas';editor.title=s.name;buildRail(selectedRail,s,index,true);body.append(editor,selectedRail);drawSprite(editor,s,L);wireSelected()}
    else{const c=document.createElement('canvas');c.className='artboardshadow spritecanvas';drawSprite(c,s,-1);wireTemporary(c,index,s);const rail=document.createElement('div');buildRail(rail,s,index,false);body.append(c,rail)}
    unit.append(title,body);return unit;
  }

  drawEditor=function(){editor.remove();selectedRail.remove();stage.innerHTML='';fr().sprites.forEach((s,i)=>stage.appendChild(makeUnit(i,s)));syncAllSpriteScales();if(typeof renderCompositePreview==='function')renderCompositePreview()};
  render();
})();
