'use strict';
(() => {
  const baseDirty=dirty;
  dirty=function(save=true){
    if(typeof syncSelectedPatternPeers==='function')syncSelectedPatternPeers();
    return baseDirty(save);
  };
})();
