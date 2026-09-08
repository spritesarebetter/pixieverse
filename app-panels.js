'use strict';
(() => {
  const link=document.createElement('link');link.rel='stylesheet';link.href='layout.css?v=20260909a';document.head.appendChild(link);
  function setCollapsed(section,collapsed){
    section.classList.toggle('collapsed',collapsed);
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.setAttribute('aria-expanded',String(!collapsed));
    button.textContent=collapsed?'▸':'▾';
    const title=section.querySelector('h2')?.textContent?.trim()||'menu';
    button.title=(collapsed?'Show ':'Hide ')+title;
    if(!collapsed)requestAnimationFrame(()=>{window.redrawPreviewNow?.();window.syncAllSpriteScales?.()});
  }
  document.querySelectorAll('[data-collapsible]').forEach(section=>{
    const button=section.querySelector(':scope > .sectionhead .collapseToggle, :scope > .timelinehead .collapseToggle');
    if(!button)return;
    button.onclick=e=>{e.preventDefault();e.stopPropagation();setCollapsed(section,!section.classList.contains('collapsed'))};
  });
  editorZoom=.5;
  applyEditorScale();
  window.syncAllSpriteScales?.();
})();
