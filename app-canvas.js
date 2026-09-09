'use strict';
const EDITOR_BASE_CELL=30;
let editorZoom=1;

function applyEditorScale(){
  const c=$('editor');if(!c)return;
  const cssCell=EDITOR_BASE_CELL*editorZoom,w=aw()*cssCell,h=ah()*cssCell;
  c.style.width=w+'px';c.style.height=h+'px';
  const badge=$('editorZoom');if(badge)badge.textContent=Math.round(editorZoom*100)+'%';
}
function changeEditorZoom(delta){editorZoom=C(Math.round((editorZoom+delta*.1)*10)/10,.1,8);applyEditorScale()}

/* Lightweight bootstrap renderer. app-sprites.js replaces this with the full object editor renderer. */
function drawEditor(){
  const c=$('editor');if(!c)return;
  const n=sz(),scale=30,g=c.getContext('2d');editorCell=scale;c.width=n*scale;c.height=n*scale;
  g.fillStyle=PAL[0]||'#000';g.fillRect(0,0,c.width,c.height);
  g.strokeStyle='rgba(255,255,255,.09)';g.lineWidth=1;
  for(let x=0;x<=n;x++){g.beginPath();g.moveTo(x*scale+.5,0);g.lineTo(x*scale+.5,c.height);g.stroke()}
  for(let y=0;y<=n;y++){g.beginPath();g.moveTo(0,y*scale+.5);g.lineTo(c.width,y*scale+.5);g.stroke()}
  applyEditorScale();
}
function editorPoint(e){const r=$('editor').getBoundingClientRect();return{x:C(Math.floor((e.clientX-r.left)/r.width*aw()),0,aw()-1),y:C(Math.floor((e.clientY-r.top)/r.height*ah()),0,ah()-1)}}
function layerPoint(p){return p}
function inLayer(p){return p.x>=0&&p.y>=0&&p.x<sz()&&p.y<sz()}
function toolset(t){tool=t;$('pencil').classList.toggle('on',t==='pencil');$('eraser').classList.toggle('on',t==='eraser')}
function shiftBitmap(dx,dy){const n=sz(),m=mask();for(let y=0;y<n;y++)for(let x=0;x<n;x++)m[(y+dy+n)%n][(x+dx+n)%n]=layer().mask[y][x];layer().mask=m;dirty();render()}
function flip(horizontal){const n=sz(),m=mask();for(let y=0;y<n;y++)for(let x=0;x<n;x++)m[horizontal?y:n-1-y][horizontal?n-1-x:x]=layer().mask[y][x];layer().mask=m;dirty();render()}

function sx(s){return P.sceneX+s.ox}
function sy(s){return P.sceneY+s.oy}
function covers(s,y){return s.visible&&y>=sy(s)&&y<sy(s)+sz()}
function warnings(){let bad=0;for(let y=0;y<212;y++)if(fr().sprites.filter(s=>covers(s,y)).length>8)bad++;$('warn').textContent=bad?'⚠ '+bad+' scanlines exceed 8 sprites':''}
function dl(data,name,type='application/octet-stream'){const a=document.createElement('a'),b=data instanceof Blob?data:new Blob([data],{type});a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function patternBase(s){const p=Math.round(Number(s?.pattern)||0);return sz()===16?C(p,0,63)*4:C(p,0,255)}
function patBytes(){const out=new Uint8Array(2048);for(const s of fr().sprites){const p=patternBase(s);if(sz()===8){for(let y=0;y<8;y++){let b=0;for(let x=0;x<8;x++)b|=s.mask[y][x]<<(7-x);out[p*8+y]=b}}else{[[0,0],[0,8],[8,0],[8,8]].forEach(([ox,oy],qi)=>{for(let y=0;y<8;y++){let b=0;for(let x=0;x<8;x++)b|=s.mask[oy+y][ox+x]<<(7-x);out[(p+qi)*8+y]=b}})}}return out}
function colBytes(){const out=new Uint8Array(512);fr().sprites.slice(0,32).forEach((s,i)=>{for(let y=0;y<16;y++){const a=s.lines[y];let b=a.color&15;if(a.or)b|=64;out[i*16+y]=b}});return out}
function satBytes(){const out=new Uint8Array(128);fr().sprites.slice(0,32).forEach((s,i)=>{out[i*4]=(sy(s)-1)&255;out[i*4+1]=sx(s)&255;out[i*4+2]=patternBase(s)&255;out[i*4+3]=0});for(let i=fr().sprites.length;i<32;i++)out[i*4]=216;return out}
function paletteBytes(){const out=new Uint8Array(32);P.palette.forEach((rgb,i)=>{out[i*2]=((rgb[0]&7)<<4)|(rgb[2]&7);out[i*2+1]=rgb[1]&7});return out}
