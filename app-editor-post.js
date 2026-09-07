'use strict';
(() => {
  const wrapped=drawEditor;
  drawEditor=function(){
    const s=layer(),ox=s.ox,oy=s.oy;s.ox=0;s.oy=0;
    try{wrapped()}finally{s.ox=ox;s.oy=oy}
    if(typeof syncAllSpriteScales==='function')syncAllSpriteScales();
  };
  render();
})();
