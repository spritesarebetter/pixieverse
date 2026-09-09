'use strict';
const DEFAULT_PALETTE=[
  [0,0,0],[0,0,0],[2,5,2],[3,6,3],
  [2,2,6],[4,3,7],[5,3,2],[3,6,7],
  [6,3,2],[7,4,3],[6,5,3],[6,6,4],
  [2,4,2],[5,3,5],[6,6,6],[7,7,7]
];
const STORAGE_KEY='pixieverse.project.twocolor.v1';
let PAL=[];
const $=id=>document.getElementById(id),C=(v,a,b)=>Math.max(a,Math.min(b,v)),clone=o=>JSON.parse(JSON.stringify(o));
let P,F=0,S=0,L=0,K=15,tool='pencil',editorCell=24;

const mask=()=>Array.from({length:16},()=>Array(16).fill(0));
const attrs=()=>Array.from({length:16},()=>({color:0,or:false}));
const normalizeRgb3=rgb=>Array.from({length:3},(_,i)=>C(Math.round(Number(rgb?.[i])||0),0,7));
const rgb8=rgb=>rgb.map(v=>Math.round(C(v,0,7)*255/7));
const rgb8To3=rgb=>Array.from({length:3},(_,i)=>C(Math.round(C(Number(rgb?.[i])||0,0,255)*7/255),0,7));
const rgb3Hex=rgb=>'#'+rgb8(rgb).map(v=>v.toString(16).padStart(2,'0')).join('');
function refreshPaletteCache(){PAL=P.palette.map(rgb3Hex)}
function normalizePalette(pal){if(!Array.isArray(pal)||pal.length!==16)throw new Error('Palette must have 16 colors');return pal.map(normalizeRgb3)}
function mkLayer(i){const maxPattern=(P?.size||16)===16?63:255;return{name:'Sprite '+i,ox:0,oy:0,pattern:C(Math.round(Number(i)||0),0,maxPattern),visible:true,transparent:true,mask:mask(),lines:attrs()}}
function mkFrame(i){return{name:'Frame '+i,wait:6,sprites:[mkLayer(0)]}}
function normalizeFrameOrigin(f){
  if(!f?.sprites?.length)return;
  const bx=Math.round(Number(f.sprites[0].ox)||0),by=Math.round(Number(f.sprites[0].oy)||0);
  f.sprites.forEach((s,i)=>{
    s.ox=Math.round(Number(s.ox)||0)-bx;s.oy=Math.round(Number(s.oy)||0)-by;
    if(/^Layer\s+\d+$/i.test(String(s.name||'')))s.name='Sprite '+i;
  });
  f.sprites[0].ox=0;f.sprites[0].oy=0;
  f.sprites[0].lines?.forEach(a=>a.or=false);
}
function defaultProject(){P={size:16,sceneX:96,sceneY:80,palette:clone(DEFAULT_PALETTE),paletteName:'MSX default',frames:[mkFrame(0)]};F=S=L=0;K=15;refreshPaletteCache()}
function parseProject(raw){
  if(!raw||typeof raw!=='object'||(+raw.size!==8&&+raw.size!==16)||!Array.isArray(raw.frames)||!raw.frames.length)throw new Error('Invalid project');
  const size=+raw.size,palette=normalizePalette(raw.palette),frames=raw.frames.map((f,fi)=>{
    if(!f||!Array.isArray(f.sprites)||!f.sprites.length||f.sprites.length>32)throw new Error('Invalid frame');
    const out={name:String(f.name||('Frame '+fi)),wait:C(Math.round(Number(f.wait)||6),1,9999),sprites:f.sprites.map((s,i)=>{
      if(!s||!Array.isArray(s.mask)||s.mask.length!==16||!Array.isArray(s.lines)||s.lines.length!==16)throw new Error('Invalid sprite');
      const m=s.mask.map(r=>{if(!Array.isArray(r)||r.length!==16)throw new Error('Invalid mask');return r.map(v=>v?1:0)});
      const lines=s.lines.map(a=>{if(!a||!Number.isFinite(+a.color)||typeof a.or!=='boolean')throw new Error('Invalid color row');return{color:C(Math.round(+a.color),0,15),or:a.or}});
      return{name:String(s.name||('Sprite '+i)),ox:Math.round(Number(s.ox)||0),oy:Math.round(Number(s.oy)||0),pattern:C(Math.round(Number(s.pattern)||0),0,size===16?63:255),visible:s.visible!==false,transparent:s.transparent!==false,mask:m,lines};
    })};
    normalizeFrameOrigin(out);return out;
  });
  return{size,sceneX:Math.round(Number(raw.sceneX)||96),sceneY:Math.round(Number(raw.sceneY)||80),palette,paletteName:String(raw.paletteName||'Palette'),frames};
}
function fresh(){defaultProject();dirty(false);render();setStatus('New project')}
const fr=()=>P.frames[F],layer=()=>fr().sprites[S],sz=()=>+P.size,aw=()=>sz(),ah=()=>sz();
function setStatus(t){$('status').textContent=t}
function dirty(save=true){setStatus('Modified');if(save)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(P))}catch(e){}}
function clampSelection(){F=C(F,0,P.frames.length-1);S=C(S,0,fr().sprites.length-1);L=C(L,0,sz()-1);K=C(K,0,15)}
function render(){clampSelection();refreshPaletteCache();renderFrames();renderLayers();props();lineTable();palette();drawEditor();warnings()}
function renderFrames(){const h=$('frames');h.innerHTML='';P.frames.forEach((f,i)=>{const d=document.createElement('div');d.className='item'+(i===F?' sel':'');d.textContent=i+' · '+f.name;d.onclick=()=>{F=i;S=0;L=0;render()};h.appendChild(d)});$('delFrame').disabled=P.frames.length<=1}
function renderLayers(){const add=$('addLayer');if(add)add.disabled=fr().sprites.length>=32}
const spriteOffsetX=(s,index)=>index===0?0:Math.round(Number(s?.ox)||0);
const spriteOffsetY=(s,index)=>index===0?0:Math.round(Number(s?.oy)||0);
function spriteMode2ColorAt(frame,x,y){
  let committed=-1,pending=0,hasPending=false;const n=sz();
  for(let index=frame.sprites.length-1;index>=0;index--){
    const s=frame.sprites[index];if(!s?.visible)continue;
    const lx=x-spriteOffsetX(s,index),ly=y-spriteOffsetY(s,index);
    if(lx<0||ly<0||lx>=n||ly>=n)continue;
    const a=s.lines[ly],color=s.mask[ly][lx]?a.color:0;
    if(s.transparent&&color===0)continue;
    if(index>0&&a.or){pending=(pending|color)&15;hasPending=true}
    else{committed=((hasPending?pending:0)|color)&15;pending=0;hasPending=false}
  }
  return committed;
}
function props(){
  const origin=S===0,lastSprite=S>=fr().sprites.length-1;
  const title=$('title');if(title)title.textContent='Object editor';
  const del=$('layerDel'),up=$('layerUp'),down=$('layerDown');
  if(del)del.disabled=origin||fr().sprites.length<=1;
  if(up)up.disabled=S<=1;
  if(down)down.disabled=origin||lastSprite;
}
function updatePaletteEditor(){
  const rgb=P.palette[K],out=rgb8(rgb),hex=PAL[K],index=$('paletteIndex'),chip=$('paletteChip'),hexEl=$('paletteHex');
  if(index)index.textContent='Color '+K;if(chip)chip.style.background=hex;if(hexEl)hexEl.textContent=hex.toUpperCase();
  const r=$('msxR'),g=$('msxG'),b=$('msxB');if(r)r.value=rgb[0];if(g)g.value=rgb[1];if(b)b.value=rgb[2];
  const pr=$('palR'),pg=$('palG'),pb=$('palB');if(pr)pr.value=out[0];if(pg)pg.value=out[1];if(pb)pb.value=out[2];
}
function palette(){
  const h=$('palette');if(!h)return;h.innerHTML='';
  PAL.forEach((c,i)=>{const b=document.createElement('button');b.className='sw'+(layer().lines[L].color===i?' on':'')+(K===i?' editing':'');b.style.background=c;b.title='Color '+i+' · '+c.toUpperCase();b.onclick=()=>{K=i;render()};h.appendChild(b)});
  updatePaletteEditor();
}
function setPaletteComponent3(channel,value){P.palette[K][channel]=C(Math.round(Number(value)||0),0,7);refreshPaletteCache();dirty();render()}
function setPaletteComponent8(channel,value){const out=rgb8(P.palette[K]);out[channel]=C(Math.round(Number(value)||0),0,255);P.palette[K]=rgb8To3(out);refreshPaletteCache();dirty();render()}
function lineTable(){L=C(L,0,sz()-1)}
