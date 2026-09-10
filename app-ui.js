$('new').onclick=()=>{if(confirm('Start a new project?')){fresh();if(typeof refreshPaletteFileMenu==='function')refreshPaletteFileMenu('msx')}};
$('save').onclick=()=>dl(JSON.stringify(P,null,2),'pixieverse.msxsprite','application/json');
$('load').onclick=()=>$('loadFile').click();
$('loadFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{P=parseProject(JSON.parse(await f.text()));F=S=L=0;K=15;dirty();render();if(typeof refreshPaletteFileMenu==='function')refreshPaletteFileMenu();setStatus('Project loaded')}catch(err){alert('Invalid current Pixieverse project')}finally{e.target.value=''}};
$('addFrame').onclick=()=>{P.frames.push(clone(fr()));F=P.frames.length-1;fr().name='Frame '+F;normalizeFramePriorities(fr());S=0;L=0;dirty();render()};
$('dupFrame').onclick=()=>{const f=clone(fr());f.name=fr().name+' copy';normalizeFramePriorities(f);P.frames.splice(F+1,0,f);F++;S=0;L=0;dirty();render()};
$('delFrame').onclick=()=>{if(P.frames.length>1){P.frames.splice(F,1);F=C(F,0,P.frames.length-1);S=L=0;dirty();render()}};
$('dupLayer').onclick=()=>{if(fr().sprites.length<32){const s=clone(layer());s.name='Sprite '+fr().sprites.length;s.priority=fr().sprites.length;fr().sprites.push(s);S=fr().sprites.length-1;normalizeFrameOrigin(fr());dirty();render()}};
$('layerDel').onclick=()=>{if(S===0)return;if(fr().sprites.length>1){fr().sprites.splice(S,1);S=C(S,0,fr().sprites.length-1);normalizeFrameOrigin(fr());L=0;dirty();render()}};
$('editorZoomOut').addEventListener('click',e=>{e.preventDefault();changeEditorZoom(-1)});$('editorZoomIn').addEventListener('click',e=>{e.preventDefault();changeEditorZoom(1)});
$('editorWrap').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();changeEditorZoom(e.deltaY<0?1:-1)},{passive:false});
$('pencil').onclick=()=>toolset('pencil');$('eraser').onclick=()=>toolset('eraser');
$('left').onclick=()=>shiftBitmap(-1,0);$('right').onclick=()=>shiftBitmap(1,0);$('up').onclick=()=>shiftBitmap(0,-1);$('down').onclick=()=>shiftBitmap(0,1);
$('flipH').onclick=()=>flip(true);$('flipV').onclick=()=>flip(false);
$('invert').onclick=()=>{for(let y=0;y<sz();y++)for(let x=0;x<sz();x++)layer().mask[y][x]^=1;dirty();render()};
$('clear').onclick=()=>{for(let y=0;y<sz();y++)for(let x=0;x<sz();x++)layer().mask[y][x]=0;dirty();render()};
$('clearSprite').onclick=()=>{for(let y=0;y<16;y++){layer().lines[y].color=0;layer().lines[y].or=false;for(let x=0;x<16;x++)layer().mask[y][x]=0}dirty();render();setStatus('Sprite cleared to Color 0')};
$('expPat').onclick=()=>dl(patBytes(),'patterns.bin');$('expCol').onclick=()=>dl(colBytes(),'colors.bin');$('expSat').onclick=()=>dl(satBytes(),'sat.bin');$('expPal').onclick=()=>dl(paletteBytes(),'palette.bin');
$('expAsm').onclick=()=>{const arr=[...patBytes()],txt='; Pixieverse Sprite Mode 2\nsprite_patterns:\n'+arr.map((v,i)=>(i%16?'':'\n  db ')+'$'+v.toString(16).padStart(2,'0')).join(',').replace(/,\n/g,'\n');dl(txt,'sprites.asm','text/plain')};

const exportMenu=$('frameExportMenu'),exportMenuButton=$('exportFrameMenuButton'),exportTitle=$('frameExportTitle');
function closeFrameExport(){if(!exportMenu)return;exportMenu.hidden=true;if(exportMenuButton)exportMenuButton.setAttribute('aria-expanded','false')}
function openFrameExport(){
  if(!exportMenu||!exportMenuButton)return;
  exportMenu.hidden=false;exportMenuButton.setAttribute('aria-expanded','true');
  if(exportTitle)exportTitle.textContent='Export Frame '+F+' · '+fr().name;
  const r=exportMenuButton.getBoundingClientRect(),mw=exportMenu.offsetWidth||220,mh=exportMenu.offsetHeight||160,pad=6;
  let left=Math.min(window.innerWidth-mw-pad,Math.max(pad,r.right-mw)),top=r.bottom+4;
  if(top+mh>window.innerHeight-pad)top=Math.max(pad,r.top-mh-4);
  exportMenu.style.left=Math.round(left)+'px';exportMenu.style.top=Math.round(top)+'px';
}
if(exportMenuButton)exportMenuButton.onclick=e=>{e.stopPropagation();exportMenu?.hidden?openFrameExport():closeFrameExport()};
if(exportMenu){
  exportMenu.addEventListener('pointerdown',e=>e.stopPropagation());
  exportMenu.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>closeFrameExport()));
}
document.addEventListener('pointerdown',closeFrameExport);
window.addEventListener('resize',closeFrameExport);
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeFrameExport()});

window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();if(k==='p')toolset('pencil');if(k==='e')toolset('eraser');if(k==='+'||k==='=')changeEditorZoom(1);if(k==='-'||k==='_')changeEditorZoom(-1)});
try{const saved=localStorage.getItem(STORAGE_KEY);if(!saved)throw 0;P=parseProject(JSON.parse(saved));render();setStatus('Restored autosave')}catch(e){try{localStorage.removeItem(STORAGE_KEY)}catch(_){}defaultProject();render();setStatus('Ready · fresh Color 0 project')}
