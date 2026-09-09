'use strict';
const PALETTE_PRESETS={
  msx:{label:'MSX default',rgb3:DEFAULT_PALETTE},
  msx1:{label:'MSX1 (SofaRun)',rgb3:[[0,0,0],[0,0,0],[0,5,1],[2,6,3],[2,3,7],[3,4,7],[6,3,2],[1,6,7],[7,3,2],[7,4,3],[5,5,2],[6,6,3],[0,4,1],[6,3,5],[6,6,6],[7,7,7]]},
  frscool:{label:'FRS CoolColors',rgb3:[[0,0,0],[0,0,0],[2,5,3],[3,6,4],[1,2,5],[2,3,6],[5,2,1],[3,5,7],[6,3,2],[7,4,2],[7,6,2],[7,7,4],[1,4,2],[5,2,4],[5,5,5],[7,7,7]]},
  db16:{label:'DawnBringer DB16',rgb8:[[20,12,28],[68,36,52],[48,52,109],[78,74,78],[133,76,48],[52,101,36],[208,70,72],[117,113,97],[89,125,206],[210,125,44],[133,149,161],[109,170,44],[210,170,153],[109,194,202],[218,212,94],[222,238,214]]},
  arne16:{label:'Arne16',rgb8:[[0,0,0],[157,157,157],[255,255,255],[190,38,51],[224,111,139],[73,60,43],[164,100,34],[235,137,49],[247,226,107],[47,72,78],[68,137,26],[163,206,39],[27,38,50],[0,87,132],[49,162,242],[178,220,239]]},
  jmp:{label:'JMP (MSX-inspired)',rgb8:[[0,0,0],[25,16,40],[70,175,69],[161,214,133],[69,62,120],[118,100,254],[131,49,41],[158,194,232],[220,83,75],[225,141,121],[214,185,123],[233,216,161],[33,108,75],[211,101,200],[175,170,185],[245,244,235]]},
  simplejpc16:{label:'SimpleJPC-16',rgb8:[[5,4,3],[34,31,49],[84,53,22],[155,110,45],[225,176,71],[245,238,155],[254,254,254],[139,225,224],[124,194,100],[103,143,203],[49,111,35],[64,74,104],[161,77,63],[165,104,212],[154,147,183],[234,145,130]]},
  sweetie16:{label:'Sweetie 16',rgb8:[[26,28,44],[93,39,93],[177,62,83],[239,125,87],[255,205,117],[167,240,112],[56,183,100],[37,113,121],[41,54,111],[59,93,201],[65,166,246],[115,239,247],[244,244,244],[148,176,194],[86,108,134],[51,60,87]]},
  pico8:{label:'PICO-8',rgb8:[[0,0,0],[29,43,83],[126,37,83],[0,135,81],[171,82,54],[95,87,79],[194,195,199],[255,241,232],[255,0,77],[255,163,0],[255,236,39],[0,228,54],[41,173,255],[131,118,156],[255,119,168],[255,204,170]]},
  c64:{label:'Commodore 64',rgb8:[[0,0,0],[255,255,255],[136,57,50],[103,182,189],[139,63,150],[85,160,73],[64,49,141],[191,206,114],[139,84,41],[87,66,0],[184,105,98],[80,80,80],[120,120,120],[148,224,137],[120,105,196],[159,159,159]]}
};
function presetRgb3(key){const p=PALETTE_PRESETS[key];return p?clone(p.rgb3||p.rgb8.map(rgb8To3)):null}
function applyPalettePreset(key){const next=presetRgb3(key);if(!next)return;P.palette=next;P.paletteName=PALETTE_PRESETS[key].label;refreshPaletteCache();dirty();render();if(typeof refreshPaletteFileMenu==='function')refreshPaletteFileMenu(key);setStatus(P.paletteName+' applied')}
function safePaletteName(name){return String(name||'palette').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,64)||'palette'}
function paletteGplText(){const name=safePaletteName(P.paletteName),rows=P.palette.map((rgb,i)=>{const v=rgb8(rgb);return `${String(v[0]).padStart(3)} ${String(v[1]).padStart(3)} ${String(v[2]).padStart(3)} Color ${i}`});return `GIMP Palette\nName: ${name}\nColumns: 8\n# Pixieverse MSX palette\n${rows.join('\n')}\n`}
function savePaletteGpl(){const name=safePaletteName(P.paletteName).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'palette';dl(paletteGplText(),name+'.gpl','text/plain')}
function parsePaletteGpl(text){if(!/^\s*GIMP Palette\b/m.test(text))throw new Error('Not a GIMP Palette file');const name=(text.match(/^Name:\s*(.+)$/mi)||[])[1]?.trim()||'Loaded palette',colors=[];for(const line of text.split(/\r?\n/)){const m=line.match(/^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s+|$)/);if(m)colors.push(rgb8To3([+m[1],+m[2],+m[3]]))}if(colors.length<16)throw new Error('Palette needs at least 16 colors');return{name,colors:colors.slice(0,16)}}
async function loadPaletteFromFile(file){const parsed=parsePaletteGpl(await file.text());P.palette=parsed.colors;P.paletteName=parsed.name;K=C(K,0,15);refreshPaletteCache();dirty();render();if(typeof refreshPaletteFileMenu==='function')refreshPaletteFileMenu('load');setStatus('Loaded palette: '+parsed.name)}
