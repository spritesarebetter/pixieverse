'use strict';
(() => {
  const SAVED_KEY='pixieverse.savedPalettes',OVERRIDE_KEY='pixieverse.palettePresetOverrides';
  const menu=$('paletteFileSelect'),file=$('paletteFile');
  let activeRef='current',baselineName='',baselinePalette='';

  function readSaved(){try{const v=JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');return Array.isArray(v)?v.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&Array.isArray(p.palette)&&p.palette.length===16):[]}catch(e){return[]}}
  function writeSaved(list){localStorage.setItem(SAVED_KEY,JSON.stringify(list))}
  function readOverrides(){try{const v=JSON.parse(localStorage.getItem(OVERRIDE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return{}}}
  function writeOverrides(v){localStorage.setItem(OVERRIDE_KEY,JSON.stringify(v))}
  const paletteJson=()=>JSON.stringify(normalizePalette(P.palette));
  function markClean(){baselineName=String(P.paletteName||'Palette');baselinePalette=paletteJson()}
  function isDirty(){return String(P.paletteName||'Palette')!==baselineName||paletteJson()!==baselinePalette}
  function presetEntry(key){const preset=PALETTE_PRESETS[key],override=readOverrides()[key];if(!preset)return null;return{name:String(override?.name||preset.label),palette:normalizePalette(override?.palette||presetRgb3(key))}}
  function dataForRef(ref){if(ref.startsWith('preset:'))return presetEntry(ref.slice(7));if(ref.startsWith('saved:')){const p=readSaved().find(x=>x.id===ref.slice(6));return p?{name:p.name,palette:normalizePalette(p.palette)}:null}return null}
  function option(value,label,group){const o=document.createElement('option');o.value=value;o.textContent=label;group.appendChild(o)}
  function normalizePreferred(value){if(!value)return'';if(value.startsWith('preset:')||value.startsWith('saved:')||value==='current')return value;if(PALETTE_PRESETS[value])return'preset:'+value;return''}
  function detectRef(){
    const pj=paletteJson(),name=String(P.paletteName||'Palette');
    for(const key of Object.keys(PALETTE_PRESETS)){const p=presetEntry(key);if(p&&p.name===name&&JSON.stringify(p.palette)===pj)return'preset:'+key}
    for(const p of readSaved())if(p.name===name&&JSON.stringify(normalizePalette(p.palette))===pj)return'saved:'+p.id;
    return'current';
  }
  function buildMenu(){
    const keep=activeRef;menu.innerHTML='';
    const built=document.createElement('optgroup');built.label='Tool palettes';Object.keys(PALETTE_PRESETS).forEach(key=>{const p=presetEntry(key);option('preset:'+key,p.name,built)});menu.appendChild(built);
    const saved=readSaved();if(saved.length){const own=document.createElement('optgroup');own.label='Saved palettes';saved.forEach(p=>option('saved:'+p.id,p.name,own));menu.appendChild(own)}
    if(keep==='current'||![...menu.options].some(o=>o.value===keep))option('current',String(P.paletteName||'Current palette')+' *',menu);
    menu.value=[...menu.options].some(o=>o.value===keep)?keep:'current';
    $('deletePaletteLocal').disabled=!activeRef.startsWith('saved:');
  }
  window.refreshPaletteFileMenu=function(preferred=''){
    const pref=normalizePreferred(preferred);
    activeRef=pref||detectRef();
    if(pref&&pref!=='current'){
      const data=dataForRef(pref);if(data){P.palette=clone(data.palette);P.paletteName=data.name;refreshPaletteCache();render()}
    }
    markClean();buildMenu();
  };

  function saveTool(showStatus=true,newName=null){
    const name=safePaletteName(newName??P.paletteName),pal=normalizePalette(P.palette);
    if(activeRef.startsWith('preset:')){
      const key=activeRef.slice(7),overrides=readOverrides();overrides[key]={name,palette:pal};writeOverrides(overrides);P.paletteName=name;
    }else if(activeRef.startsWith('saved:')){
      const id=activeRef.slice(6),list=readSaved(),item={id,name,palette:pal};writeSaved(list.map(p=>p.id===id?item:p));P.paletteName=name;
    }else{
      const id='pal-'+Date.now().toString(36),list=readSaved();writeSaved([...list,{id,name,palette:pal}]);activeRef='saved:'+id;P.paletteName=name;
    }
    dirty();markClean();buildMenu();if(showStatus)setStatus('Palette saved in tool: '+name);return true;
  }
  function saveGpl(){savePaletteGpl();markClean();setStatus('Palette saved as .gpl: '+safePaletteName(P.paletteName))}
  function promptUnsaved(){
    if(!isDirty())return true;
    const answer=prompt('Palette has unsaved changes. Type “tool” to save in Pixieverse, “gpl” to save a .gpl file, or “no” to discard the palette changes.','tool');
    if(answer===null)return false;
    const choice=answer.trim().toLowerCase();
    if(choice==='tool'||choice==='in the tool'||choice==='save'){saveTool(false);return true}
    if(choice==='gpl'||choice==='.gpl'){saveGpl();return true}
    if(choice==='no'||choice==='discard'||choice==='none')return true;
    alert('Please enter “tool”, “gpl”, or “no”.');return false;
  }
  function applyRef(ref){
    const data=dataForRef(ref);if(!data)return false;
    P.palette=clone(data.palette);P.paletteName=data.name;activeRef=ref;refreshPaletteCache();dirty();render();markClean();buildMenu();setStatus('Palette: '+data.name);return true;
  }
  function deletePalette(){
    if(!activeRef.startsWith('saved:'))return;
    const id=activeRef.slice(6),p=readSaved().find(x=>x.id===id);if(!p)return;
    if(!confirm('Delete saved palette “'+p.name+'”?'))return;
    writeSaved(readSaved().filter(x=>x.id!==id));activeRef='preset:msx';applyRef(activeRef);setStatus('Palette deleted: '+p.name);
  }
  function renamePalette(){
    const next=prompt('Rename palette',String(P.paletteName||'Palette'));if(next===null)return;
    const name=safePaletteName(next);if(!name)return;P.paletteName=name;saveTool(false,name);setStatus('Palette renamed: '+name);
  }
  function restoreDefaults(){
    if(!promptUnsaved())return;
    if(!confirm('Restore all built-in palettes to their original names and colors?'))return;
    localStorage.removeItem(OVERRIDE_KEY);
    if(activeRef.startsWith('preset:'))applyRef(activeRef);else{buildMenu();setStatus('Default palettes restored')}
  }
  function loadGpl(){if(promptUnsaved())file.click()}

  menu.onchange=()=>{const next=menu.value;if(next===activeRef)return;if(!promptUnsaved()){menu.value=activeRef;return}if(!applyRef(next)){menu.value=activeRef}};
  $('savePaletteLocal').onclick=()=>saveTool();
  $('deletePaletteLocal').onclick=deletePalette;
  $('renamePaletteLocal').onclick=renamePalette;
  $('savePaletteFile').onclick=saveGpl;
  $('loadPaletteFile').onclick=loadGpl;
  $('restorePaletteDefaults').onclick=restoreDefaults;
  file.onchange=async e=>{
    const f=e.target.files[0];if(!f)return;
    try{const parsed=parsePaletteGpl(await f.text());P.palette=normalizePalette(parsed.colors);P.paletteName=parsed.name;K=C(K,0,15);activeRef='current';refreshPaletteCache();dirty();render();buildMenu();setStatus('Loaded .gpl palette: '+parsed.name)}catch(err){alert(err.message)}finally{e.target.value=''}
  };
  [['msxR',0],['msxG',1],['msxB',2]].forEach(([id,c])=>{const el=$(id);if(el)el.oninput=e=>setPaletteComponent3(c,e.target.value)});

  activeRef=detectRef();markClean();buildMenu();
})();
