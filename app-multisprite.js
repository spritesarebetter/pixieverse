'use strict';
(() => {
  const stage=$('editorStage'),editor=$('editor'),selectedRail=$('spriteColorRail'),selectedLines=$('lines');
  layerPoint=p=>p;
  lineTable=function(){L=C(L,0,sz()-1)};
  function canvasCssSize(){return sz()*EDITOR_BASE_CELL*editorZoom}
  function railWidth(cell){return Math.max(48,cell*2.05)}
  function syncAllSpriteScales(){
    const cell=EDITOR_BASE_CELL*editorZoom,size=canvasCssSize(),rw=railWidth(cell);
    stage.style.setProperty('--editor-cell',cell+'px');stage.style.setProperty('--sprite-gap',cell+'px');stage.style.gap=cell+'px';
    stage.querySelectorAll('.spritecanvas').forEach(c=>{c.style.width=size+'px';c.style.height=size+'px';c.style.minWidth=size+'px';c.style.minHeight=size+'px'});
    stage.querySelectorAll('.spritecolorrail').forEach(r=>{r.style.width=rw+'px';r.style.height=size+'px';const ls=r.querySelector('.spriterows');if(ls)ls.style.height=size+'px'});
  }
  window.syncAllSpriteScales=syncAllSpriteScales;
  const baseApply=applyEditorScale;
  applyEditorScale=function(){baseApply();syncAllSpriteScales();$('editorZoom').textContent=Math.round(editorZoom*100)+'%'};
  function drawSprite(c,s,line=-1){
    const n=sz(),scale=editorRenderScale(),g=c.getContext('2d');c.width=n*scale;c.height=n*scale;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){g.fillStyle=(x+y)%2?'#171b22':'#20252d';g.fillRect(x*scale,y*scale,scale,scale);if(s.mask[y][x]&&s.lines[y].color){g.fillStyle=PAL[s.lines[y].color];g.fillRect(x*scale+1,y*scale+1,scale-2,scale-2)}}
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}if(line>=0){g.strokeStyle='rgba(101,215,192,.65)';g.strokeRect(2,line*scale+2,n*scale-4,scale-4)}
  }
  function paintLine(s,a,b,v){let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy;for(;;){s.mask[y0][x0]=v;if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}}
  function pointFor(c,e){const r=c.getBoundingClientRect();return{x:C(Math.floor((e.clientX-r.left)/r.width*sz()),0,sz()-1),y:C(Math.floor((e.clientY-r.top)/r.height*sz()),0,sz()-1)}}
  function wirePreviewCanvas(c,index,s){let active=false,lastp=null,erase=false,changed=false;c.oncontextmenu=e=>e.preventDefault();c.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;if($('selectTool').classList.contains('on')){e.preventDefault();S=index;L=0;render();return}e.preventDefault();S=index;const p=pointFor(c,e);L=p.y;active=true;lastp=p;erase=e.button===2||tool==='eraser';changed=true;paintLine(s,p,p,erase?0:1);c.setPointerCapture?.(e.pointerId);drawSprite(c,s,L)});c.addEventListener('pointermove',e=>{if(!active)return;e.preventDefault();const p=pointFor(c,e);paintLine(s,lastp,p,erase?0:1);lastp=p;L=p.y;drawSprite(c,s,L)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>c.addEventListener(ev,()=>{if(!active)return;active=false;lastp=null;if(changed){dirty();render()}changed=false}))}
  function buildRail(rows,s,index,selected){rows.innerHTML='';for(let y=0;y<sz();y++){const a=s.lines[y],r=document.createElement('div');r.className='colorrow'+(selected&&y===L?' sel':'');const sw=document.createElement('button');sw.className='linecolorswatch';sw.style.background=PAL[a.color];sw.title='Color '+String(a.color).padStart(2,'0');const or=document.createElement('input');or.type='checkbox';or.className='orbox';or.checked=!!a.or;or.title='OR / combine color';sw.onclick=e=>{e.stopPropagation();S=index;L=y;K=a.color;render()};or.onclick=e=>e.stopPropagation();or.onchange=()=>{S=index;L=y;a.or=or.checked;dirty();render()};r.onclick=()=>{S=index;L=y;K=a.color;render()};r.append(sw,or);rows.appendChild(r)}}
  function makeRail(index,s){const rail=document.createElement('div');rail.className='spritecolorrail';rail.innerHTML='<div class="colorlabels"><span>Color</span><span>OR</span></div><div class="spriterows"></div>';buildRail(rail.querySelector('.spriterows'),s,index,false);return rail}
  function makeUnit(index,s){const unit=document.createElement('div');unit.className='spriteunit'+(index===S?' selected':'');unit.dataset.sprite=String(index);if(index===S){editor.className='artboardshadow spritecanvas';editor.title='Sprite '+index;selectedRail.className='spritecolorrail';selectedLines.className='spriterows';buildRail(selectedLines,s,index,true);unit.append(editor,selectedRail);drawSprite(editor,s,L)}else{const c=document.createElement('canvas');c.className='artboardshadow spritecanvas';c.title='Sprite '+index+' · click to select/edit';drawSprite(c,s,-1);wirePreviewCanvas(c,index,s);unit.append(c,makeRail(index,s))}return unit}
  drawEditor=function(){editorCell=editorRenderScale();editor.remove();selectedRail.remove();stage.innerHTML='';fr().sprites.forEach((s,i)=>stage.appendChild(makeUnit(i,s)));syncAllSpriteScales()};
  new ResizeObserver(syncAllSpriteScales).observe(editor);render();
})();
