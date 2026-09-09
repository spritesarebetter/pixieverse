'use strict';
const DEFAULT_PALETTE=[
  [0,0,0],[0,0,0],[2,5,2],[3,6,3],
  [2,2,6],[4,3,7],[5,3,2],[3,6,7],
  [6,3,2],[7,4,3],[6,5,3],[6,6,4],
  [2,4,2],[5,3,5],[6,6,6],[7,7,7]
];
const STORAGE_KEY='pixieverse';
let PAL=[];
const $=id=>document.getElementById(id),C=(v,a,b)=>Math.max(a,Math.min(b,v)),clone=o=>JSON.parse(JSON.stringify(o));
let P,F=0,S=0,L=0,K=15,drag=false,tool='pencil',last=null,previewScale=1,editorCell=24;

const mask=()=>Array.from({length:16},()=>Array(16).fill(0));
const attrs=()=>Array.from({length:16},(_,i)=>({color:i<3?15:i<8?6:i<13?8:4,or:false}));
const normalizeRgb3=rgb=>Array.from({length:3},(_,i)=>C(Math.round(Number(rgb?.[i])||0),0,7));
const rgb8=rgb=>rgb.map(v=>Math.round(C(v,0,7)*255/7));
const rgb8To3=rgb=>Array.from({length:3},(_,i)=>C(Math.round(C(Number(rgb?.[i])||0,0,255)*7/255),0,7));
const rgb3Hex=rgb=>'#'+rgb8(rgb).map(v=>v.toString(16).padStart(2,'0')).join('');
function refreshPaletteCache(){PAL=P.palette.map(rgb3Hex)}
function normalizePalette(pal){if(!Array.isArray(pal)||pal.length!==16)throw new Error('Palette must have 16 colors');return pal.map(normalizeRgb3)}
function mkLayer(i){return{name:'Sprite '+i,ox:0,oy:0,pattern:(P?.size||16)===16?i*4:i,visible:true,mask:mask(),lines:attrs()}}
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
      return{name:String(s.name||('Sprite '+i)),ox:Math.round(Number(s.ox)||0),oy:Math.round(Number(s.oy)||0),pattern:C(Math.round(Number(s.pattern)||0),0,255),visible:s.visible!==false,mask:m,lines};
    })};
    normalizeFrameOrigin(out);return out;
  });
  return{size,sceneX:Math.round(Number(raw.sceneX)||96),sceneY:Math.round(Number(raw.sceneY)||80),palette,paletteName:String(raw.paletteName||'Palette'),frames};
}
function fresh(){defaultProject();dirty(false);render();setStatus('New project')}
const fr=()=>P.frames[F],layer=()=>fr().sprites[S],sz=()=>+P.size,mg=()=>1,aw=()=>sz(),ah=()=>sz();
function setStatus(t){$('status').textContent=t}
function dirty(save=true){setStatus('Modified');if(save)try{localStorage.setItem(STORAGE_KEY,JSON.stringify(P))}catch(e){}}
function clampSelection(){F=C(F,0,P.frames.length-1);S=C(S,0,fr().sprites.length-1);L=C(L,0,sz()-1);K=C(K,0,15)}
function render(){clampSelection();refreshPaletteCache();renderFrames();renderLayers();props();lineTable();palette();drawEditor();warnings()}
function renderFrames(){let h=$('frames');h.innerHTML='';P.frames.forEach((f,i)=>{let d=document.createElement('div');d.className='item'+(i===F?' sel':'');d.textContent=i+' · '+f.name;d.onclick=()=>{F=i;S=0;L=0;render()};h.appendChild(d)});$('delFrame').disabled=P.frames.length<=1}
function renderLayers(){
  const h=$('layers');h.innerHTML='';
  fr().sprites.forEach((s,i)=>{
    const d=document.createElement('div');d.className='item'+(i===S?' sel':'');
    const r=document.createElement('div');r.className='itemrow spriteitemrow';
    const eye=document.createElement('button');eye.className='eye';eye.textContent=s.visible?'●':'○';eye.title=s.visible?'Hide sprite':'Show sprite';eye.onclick=e=>{e.stopPropagation();s.visible=!s.visible;dirty();render()};
    const n=document.createElement('div');n.className='spritename';n.contentEditable='true';n.spellcheck=false;n.textContent=s.name;n.title='Click to rename';
    n.onclick=e=>{e.stopPropagation();S=i;L=0;n.focus()};
    n.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();n.blur()}else if(e.key==='Escape'){e.preventDefault();n.textContent=s.name;n.blur()}};
    n.onblur=()=>{const next=n.textContent.replace(/\s+/g,' ').trim().slice(0,64)||('Sprite '+i);if(next!==s.name){s.name=next;dirty()}render()};
    const tag=document.createElement('span');tag.className='badge';tag.textContent=i===0?'ORIGIN':'';
    r.append(eye,n,tag);d.appendChild(r);d.onclick=()=>{S=i;L=0;render()};h.appendChild(d);
  });
  $('addLayer').disabled=fr().sprites.length>=32;
}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function signed(v){return v>=0?'+'+v:String(v)}
function props(){
  const s=layer(),origin=S===0,lastSprite=S>=fr().sprites.length-1;
  $('pattern').value=s.pattern;$('layerX').value=s.ox;$('layerY').value=s.oy;$('visible').checked=s.visible;$('title').textContent='Sprite editor';
  $('layerX').disabled=origin;$('layerY').disabled=origin;['moveL','moveR','moveU','moveD'].forEach(id=>$(id).disabled=origin);
  $('layerDel').disabled=origin||fr().sprites.length<=1;
  $('layerUp').disabled=S<=1;
  $('layerDown').disabled=origin||lastSprite;
}
function updatePaletteEditor(){
  const rgb=P.palette[K],out=rgb8(rgb),hex=PAL[K];
  $('paletteIndex').textContent='Color '+K;$('paletteChip').style.background=hex;$('paletteHex').textContent=hex.toUpperCase();
  $('msxR').value=rgb[0];$('msxG').value=rgb[1];$('msxB').value=rgb[2];$('palR').value=out[0];$('palG').value=out[1];$('palB').value=out[2];
}
function palette(){let h=$('palette');h.innerHTML='';PAL.forEach((c,i)=>{let b=document.createElement('button');b.className='sw'+(layer().lines[L].color===i?' on':'')+(K===i?' editing':'');b.style.background=c;b.title='Color '+i+' · '+c.toUpperCase();b.onclick=()=>{K=i;layer().lines[L].color=i;dirty();render()};h.appendChild(b)});updatePaletteEditor()}
function setPaletteComponent3(channel,value){P.palette[K][channel]=C(Math.round(Number(value)||0),0,7);refreshPaletteCache();dirty();render()}
function setPaletteComponent8(channel,value){const out=rgb8(P.palette[K]);out[channel]=C(Math.round(Number(value)||0),0,255);P.palette[K]=rgb8To3(out);refreshPaletteCache();dirty();render()}
function lineTable(){L=C(L,0,sz()-1)}
