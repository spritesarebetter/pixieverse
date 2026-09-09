'use strict';
(() => {
  const patternLimit=()=>sz()===16?63:255;
  const patternNumber=s=>C(Math.round(Number(s?.pattern)||0),0,patternLimit());

  function findPatternSource(pattern,exceptFrame=-1,exceptSprite=-1){
    for(let fi=0;fi<P.frames.length;fi++){
      const frame=P.frames[fi];
      for(let si=0;si<frame.sprites.length;si++){
        if(fi===exceptFrame&&si===exceptSprite)continue;
        const s=frame.sprites[si];
        if(patternNumber(s)===pattern)return s;
      }
    }
    return null;
  }

  function syncSelectedPatternGlobally(){
    const source=layer(),pattern=patternNumber(source);
    P.frames.forEach((frame,fi)=>frame.sprites.forEach((peer,si)=>{
      if(fi===F&&si===S)return;
      if(patternNumber(peer)===pattern)peer.mask=clone(source.mask);
    }));
  }

  document.addEventListener('change',e=>{
    const input=e.target;
    if(!(input instanceof HTMLInputElement)||!input.matches('.spritepattern input'))return;
    const unit=input.closest('.spriteunit');if(!unit)return;
    const index=C(Math.round(Number(unit.dataset.spriteIndex)||0),0,fr().sprites.length-1),next=C(Math.round(Number(input.value)||0),0,patternLimit()),existing=findPatternSource(next,F,index);
    if(existing)fr().sprites[index].mask=clone(existing.mask);
  },true);

  const baseDirty=dirty;
  dirty=function(save=true){
    syncSelectedPatternGlobally();
    return baseDirty(save);
  };

  const add=$('addLayer');
  if(add)add.onclick=()=>{
    if(fr().sprites.length>=32)return;
    let highest=-1;
    P.frames.forEach(frame=>frame.sprites.forEach(s=>highest=Math.max(highest,patternNumber(s))));
    const next=highest+1;
    if(next>patternLimit()){setStatus('No free pattern numbers');return}
    const s=mkLayer(fr().sprites.length);s.pattern=next;
    fr().sprites.push(s);S=fr().sprites.length-1;L=0;dirty();render();
  };
})();
