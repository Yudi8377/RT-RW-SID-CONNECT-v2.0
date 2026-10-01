(()=>{
  const install=()=>{
    if(window.__SMART_VILLAGE_CANONICAL_ACTION_V5__) return;
    window.__SMART_VILLAGE_CANONICAL_ACTION_V4__=true;
    const dispatch=(e)=>{
      const target=e.target.closest?.('[data-action],[data-agenda-id],[data-start-item],[data-dashboard-tab],[data-dashboard-context],[data-development-action],[data-development-back],[data-service-item],[data-service-start],[data-service-back],[data-form-back],[data-form-menu],[data-menu-main],[data-home],[data-area],[data-share-emergency],[data-economy-register],[data-economy-back]');
      if(!target)return;
      const api=window.smartVillage;
      if(!api)return;
      try{
        if(target.matches('[data-agenda-id]')){const id=target.dataset.agendaId;if(id){e.preventDefault();e.stopImmediatePropagation();window.location.assign(new URL("./agenda-detail.html?id="+encodeURIComponent(id),document.baseURI).href);}return;}if(target.matches('[data-action]') && api.handleAction){e.preventDefault();e.stopImmediatePropagation();api.handleAction(target.dataset.action);return;}
        if(target.matches('[data-start-item]') && api.startService){e.preventDefault();e.stopImmediatePropagation();api.startService(target.dataset.startItem,Number(target.dataset.itemIndex));return;}
        if(target.matches('[data-dashboard-tab]') && api.loadDashboardTab){e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('[data-dashboard-tab]').forEach(x=>x.classList.toggle('selected',x===target));api.loadDashboardTab(target.dataset.dashboardTab);return;}if(target.matches('[data-dashboard-context]') && api.dashboardContextAction){e.preventDefault();e.stopImmediatePropagation();api.dashboardContextAction(target.dataset.dashboardContext,Number(target.dataset.contextIndex));return;}if(target.matches('[data-development-action]') && api.developmentAction){e.preventDefault();e.stopImmediatePropagation();api.developmentAction(Number(target.dataset.developmentAction));return;}if(target.matches('[data-development-back]') && api.loadDashboardTab){e.preventDefault();e.stopImmediatePropagation();api.loadDashboardTab('development');return;}
        if(target.matches('[data-service-item]') && api.itemModal){e.preventDefault();e.stopImmediatePropagation();api.itemModal(target.dataset.serviceItem,Number(target.dataset.item));return;}
        if(target.matches('[data-service-start]') && api.startService){e.preventDefault();e.stopImmediatePropagation();api.startService(target.dataset.serviceStart);return;}
        if(target.matches('[data-service-back]') && api.serviceModal){e.preventDefault();e.stopImmediatePropagation();api.serviceModal(target.dataset.serviceBack);return;}
        if(target.matches('[data-form-back]') && api.itemModal){e.preventDefault();e.stopImmediatePropagation();const [svc,idx]=target.dataset.formBack.split(':');api.itemModal(svc,Number(idx));return;}
        if(target.matches('[data-form-menu]') && api.serviceModal){e.preventDefault();e.stopImmediatePropagation();api.serviceModal(target.dataset.formMenu);return;}
        if(target.matches('[data-menu-main]') && api.serviceModal){e.preventDefault();e.stopImmediatePropagation();api.serviceModal();return;}
        if(target.matches('[data-home]') && api.closeModal){e.preventDefault();e.stopImmediatePropagation();api.closeModal();window.scrollTo({top:0,behavior:'smooth'});return;}
        if(target.matches('[data-area]') && api.applyArea){e.preventDefault();e.stopImmediatePropagation();api.applyArea(target.dataset.area);api.closeModal?.();api.showToast?.('Wilayah aktif: '+(api.areas?.[target.dataset.area]?.label||target.dataset.area));return;}
        if(target.matches('[data-share-emergency]') && api.shareEmergencyLocation){e.preventDefault();e.stopImmediatePropagation();api.shareEmergencyLocation();return;}
        if(target.matches('[data-economy-register]') && api.openBusinessRegistration){e.preventDefault();e.stopImmediatePropagation();api.openBusinessRegistration();return;}
        if(target.matches('[data-economy-back]') && api.openEconomy){e.preventDefault();e.stopImmediatePropagation();api.openEconomy();return;}
      }catch(err){console.error('Smart Village canonical action failed:',err);api.showToast?.('Tindakan tidak dapat dijalankan. Silakan coba lagi.');}
    };
    document.addEventListener('click',dispatch,true);
    document.documentElement.dataset.smartVillageActions='ready-v5';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
