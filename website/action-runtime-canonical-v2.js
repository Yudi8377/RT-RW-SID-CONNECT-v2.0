(()=>{
  const run=()=>{
    if(window.__SMART_VILLAGE_CANONICAL_ACTION_V2__) return;
    window.__SMART_VILLAGE_CANONICAL_ACTION_V2__=true;
    document.addEventListener('click',(e)=>{
      const el=e.target.closest?.('[data-action]');
      if(!el) return;
      const action=el.dataset.action;
      const api=window.smartVillage;
      if(!api?.handleAction) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try{ api.handleAction(action); }
      catch(err){ console.error('Smart Village canonical action failed:',err); }
    },true);
    document.documentElement.dataset.smartVillageActions='ready';
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
})();
