'use strict';
(() => {
  const WAIT_MAX=9999,wait=f=>C(Math.round(Number(f?.wait)||6),1,WAIT_MAX);
  renderFrames=function(){
    const h=$('frames');h.innerHTML='';
    P.frames.forEach((f,i)=>{
      f.wait=wait(f);const d=document.createElement('div');d.className='item'+(i===F?' sel':'');
      const r=document.createElement('div');r.className='frameitem';
      const info=document.createElement('div');info.innerHTML='<div class="layername">'+i+' · '+esc(f.name)+'</div><div class="layerinfo">'+f.sprites.length+' sprite(s)</div>';
      const w=document.createElement('label');w.className='framewait';w.innerHTML='wait <input type="number" min="1" max="'+WAIT_MAX+'" step="1" value="'+f.wait+'">';
      const input=w.querySelector('input');input.onclick=e=>e.stopPropagation();input.onchange=e=>{e.stopPropagation();f.wait=wait({wait:e.target.value});e.target.value=f.wait;dirty()};
      r.append(info,w);d.appendChild(r);d.onclick=()=>{F=i;S=0;L=0;render()};h.appendChild(d);
    });
    $('delFrame').disabled=P.frames.length<=1;$('frameUp').disabled=F<=0;$('frameDown').disabled=F>=P.frames.length-1;
  };
  function moveFrame(delta){const n=F+delta;if(n<0||n>=P.frames.length)return;[P.frames[F],P.frames[n]]=[P.frames[n],P.frames[F]];F=n;dirty();render()}
  $('frameUp').onclick=()=>moveFrame(-1);$('frameDown').onclick=()=>moveFrame(1);renderFrames();
})();
