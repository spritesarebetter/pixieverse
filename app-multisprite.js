'use strict';
(() => {
  const stage=$('editorStage'),editor=$('editor'),selectedRail=$('spriteColorRail'),preview=$('previewCanvas');
  let previewZoom=1,showBorders=true,previewFrameOverride=null;

  layerPoint=p=>p;
  lineTable=function(){L=C(L,0,sz()-1)};
  const canvasCssSize=()=>sz()*EDITOR_BASE_CELL*editorZoom;
  const normalRailWidth=cell=>Math.max(48,cell*2.05);
  const baseRailWidth=cell=>Math.max(34,cell*1.15);

  function syncAllSpriteScales(){
    const cell=EDITOR_BASE_CELL*editorZoom,size=canvasCssSize();
    stage.style.setProperty('--editor-cell',cell+'px');stage.style.setProperty('--sprite-gap',cell+'px');stage.style.gap=cell+'px';
    stage.querySelectorAll('.spritecanvas').forEach(c=>{c.style.width=size+'px';c.style.height=size+'px';c.style.minWidth=size+'px';c.style.minHeight=size+'px'});
    stage.querySelectorAll('.spritecolorrail').forEach(r=>{
      const rw=r.classList.contains('base')?baseRailWidth(cell):normalRailWidth(cell);r.style.width=rw+'px';r.style.height=size+'px';
      const rows=r.querySelector('.spriterows');if(rows)rows.style.height=size+'px';
    });
  }
  window.syncAllSpriteScales=syncAllSpriteScales;
  const baseApply=applyEditorScale;
  applyEditorScale=function(){baseApply();syncAllSpriteScales();$('editorZoom').textContent=Math.round(editorZoom*100)+'%'};

  function drawSprite(c,s,line=-1){
    const n=sz(),scale=editorRenderScale(),g=c.getContext('2d');c.width=n*scale;c.height=n*scale;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      g.fillStyle=(x+y)%2?'#171b22':'#20252d';g.fillRect(x*scale,y*scale,scale,scale);
      if(s.mask[y][x]&&s.lines[y].color){g.fillStyle=PAL[s.lines[y].color];g.fillRect(x*scale+1,y*scale+1,scale-2,scale-2)}
    }
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;
    for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}
    for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}
    if(line>=0){g.strokeStyle='rgba(101,215,192,.65)';g.strokeRect(2,line*scale+2,n*scale-4,scale-4)}
  }

  function compositeBounds(frame){
    const n=sz();let minX=0,minY=0,maxX=n,maxY=n;
    frame.sprites.forEach(s=>{if(!s.visible)return;minX=Math.min(minX,s.ox);minY=Math.min(minY,s.oy);maxX=Math.max(maxX,s.ox+n);maxY=Math.max(maxY,s.oy+n)});
    return{minX,minY,maxX,maxY,w:maxX-minX,h:maxY-minY};
  }
  function compositeColorAt(frame,gx,gy){
    let color=null;
    frame.sprites.forEach((s,index)=>{
      if(!s.visible)return;const x=gx-s.ox,y=gy-s.oy;if(x<0||y<0||x>=sz()||y>=sz()||!s.mask[y][x])return;
      const a=s.lines[y];if(!a.color)return;if(index>0&&a.or){if(color!==null)color=(color|a.color)&15}else if(color===null)color=a.color;
    });
    return color;
  }
  function syncPreviewScale(){
    const w=Number(preview.dataset.gridW)||sz(),h=Number(preview.dataset.gridH)||sz(),cell=EDITOR_BASE_CELL*previewZoom;
    preview.style.width=(w*cell)+'px';preview.style.height=(h*cell)+'px';preview.style.minWidth=(w*cell)+'px';preview.style.minHeight=(h*cell)+'px';
    $('previewZoom').textContent=Math.round(previewZoom*100)+'%';
  }
  function drawComposite(frame=fr()){
    const b=compositeBounds(frame),scale=editorRenderScale(),g=preview.getContext('2d');preview.dataset.gridW=String(b.w);preview.dataset.gridH=String(b.h);preview.width=b.w*scale;preview.height=b.h*scale;
    for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){
      g.fillStyle=(x+y)%2?'#171b22':'#20252d';g.fillRect(x*scale,y*scale,scale,scale);
      const col=compositeColorAt(frame,b.minX+x,b.minY+y);if(col!==null){g.fillStyle=PAL[col];g.fillRect(x*scale+1,y*scale+1,scale-2,scale-2)}
    }
    g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;
    for(let x=0;x<=b.w;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,preview.height);g.stroke()}
    for(let y=0;y<=b.h;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(preview.width,y*scale+.5);g.stroke()}
    if(showBorders){
      frame.sprites.forEach((s,i)=>{if(!s.visible)return;const x=(s.ox-b.minX)*scale,y=(s.oy-b.minY)*scale;g.save();g.lineWidth=2;g.strokeStyle=i===0?'rgba(101,215,192,.9)':(frame===fr()&&i===S?'rgba(255,255,255,.9)':'rgba(255,255,255,.45)');if(i>0)g.setLineDash([Math.max(3,scale*.25),Math.max(2,scale*.15)]);g.strokeRect(x+1,y+1,sz()*scale-2,sz()*scale-2);g.restore()});
    }
    syncPreviewScale();
  }
  window.showPreviewFrame=frame=>{previewFrameOverride=frame;drawComposite(frame)};
  window.clearPreviewFrame=()=>{previewFrameOverride=null;drawComposite(fr())};
  window.renderCompositePreview=()=>drawComposite(previewFrameOverride||fr());

  function paintLine(s,a,b,v){let x0=a.x,y0=a.y,x1=b.x,y1=b.y,dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,er=dx+dy;for(;;){s.mask[y0][x0]=v;if(x0===x1&&y0===y1)break;const e2=2*er;if(e2>=dy){er+=dy;x0+=sx}if(e2<=dx){er+=dx;y0+=sy}}}
  function pointFor(c,e){const r=c.getBoundingClientRect();return{x:C(Math.floor((e.clientX-r.left)/r.width*sz()),0,sz()-1),y:C(Math.floor((e.clientY-r.top)/r.height*sz()),0,sz()-1)}}
  function wireSpriteCanvas(c,index,s){
    let active=false,lastp=null,erase=false,changed=false;c.oncontextmenu=e=>e.preventDefault();
    c.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;if($('selectTool').classList.contains('on')){e.preventDefault();S=index;L=0;render();return}e.preventDefault();S=index;const p=pointFor(c,e);L=p.y;active=true;lastp=p;erase=e.button===2||tool==='eraser';changed=true;paintLine(s,p,p,erase?0:1);c.setPointerCapture?.(e.pointerId);drawSprite(c,s,L);drawComposite(previewFrameOverride||fr())});
    c.addEventListener('pointermove',e=>{if(!active)return;e.preventDefault();const p=pointFor(c,e);paintLine(s,lastp,p,erase?0:1);lastp=p;L=p.y;drawSprite(c,s,L);drawComposite(previewFrameOverride||fr())});
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>c.addEventListener(ev,()=>{if(!active)return;active=false;lastp=null;if(changed){dirty();render()}changed=false}));
  }

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
  function makeUnit(index,s){
    const unit=document.createElement('div');unit.className='spriteunit'+(index===S?' selected':'');unit.dataset.sprite=String(index);
    const title=document.createElement('div');title.className='spritetitle';title.textContent=s.name;title.title=s.name;
    const body=document.createElement('div');body.className='spritebody';
    if(index===S){editor.className='artboardshadow spritecanvas';editor.title=s.name;buildRail(selectedRail,s,index,true);body.append(editor,selectedRail);drawSprite(editor,s,L)}
    else{const c=document.createElement('canvas');c.className='artboardshadow spritecanvas';c.title=s.name+' · click to select/edit';drawSprite(c,s,-1);wireSpriteCanvas(c,index,s);const rail=document.createElement('div');buildRail(rail,s,index,false);body.append(c,rail)}
    unit.append(title,body);return unit;
  }

  drawEditor=function(){
    editorCell=editorRenderScale();editor.remove();selectedRail.remove();stage.innerHTML='';fr().sprites.forEach((s,i)=>stage.appendChild(makeUnit(i,s)));syncAllSpriteScales();drawComposite(previewFrameOverride||fr());
  };

  $('previewZoomIn').onclick=()=>{previewZoom=C(Math.round((previewZoom+.1)*10)/10,.1,8);syncPreviewScale()};
  $('previewZoomOut').onclick=()=>{previewZoom=C(Math.round((previewZoom-.1)*10)/10,.1,8);syncPreviewScale()};
  $('previewBorders').onclick=()=>{showBorders=!showBorders;$('previewBorders').classList.toggle('on',showBorders);$('previewBorders').setAttribute('aria-pressed',String(showBorders));drawComposite(previewFrameOverride||fr())};
  new ResizeObserver(syncAllSpriteScales).observe(editor);render();
})();
