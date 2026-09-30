(()=>{
  const install=()=>{
    if(window.__SMART_VILLAGE_CANONICAL_ACTION_V3__) return;
    window.__SMART_VILLAGE_CANONICAL_ACTION_V3__=true;
    const dispatch=(e)=>{
      const el=e.target.closest?.('[data-action]');
      if(!el)return;
      const action=el.dataset.action;
      const api=window.smartVillage;
      if(api?.handleAction){
        e.preventDefault();e.stopImmediatePropagation();
        try{api.handleAction(action)}catch(err){console.error('Smart Village action failed:',err)}
        return;
      }
      const open=api?.openModal,service=api?.serviceModal;
      if(!open&&!service){return;}
      e.preventDefault();e.stopImmediatePropagation();
      try{
        if(action==='services'&&service){service();return;}
        if(['population','complaint','letter','activities','tracking','public-data'].includes(action)&&service){service(action);return;}
        const titles={news:'NEWS ENGINE',article:'ARTIKEL',dashboard:'DASHBOARD PUBLIK',gis:'GIS DESA',privacy:'PRINSIP DATA',login:'MASUK WARGA',chat:'RUANG WARGA',agenda:'AGENDA WARGA',economy:'JOLIE BUSINESS OS'};
        const copies={news:'Berita dan informasi publik.',article:'Konten editorial lengkap.',dashboard:'Indikator publik agregat.',gis:'Peta publik dengan batas data aman.',privacy:'Transparansi sumber, klasifikasi, dan penggunaan data.',login:'Masuk ke SIM RT/RW untuk layanan personal.',chat:'Ruang komunikasi warga.',agenda:'Kalender kegiatan warga.',economy:'Direktori ekonomi lokal Smart Village.'};
        if(open)open('<span class="eyebrow dark">SMART VILLAGE</span><h2 class="modal-title">'+(titles[action]||'SMART VILLAGE')+'</h2><p class="modal-copy">'+(copies[action]||'Ruang digital desa.')+'</p><div class="modal-cta"><button class="btn btn-outline-civic" data-menu-main>Menu utama</button><button class="btn btn-outline-civic" data-home>Home</button></div>');
      }catch(err){console.error('Smart Village fallback action failed:',err)}
    };
    document.addEventListener('click',dispatch,true);
    document.documentElement.dataset.smartVillageActions='ready';
    const probe=()=>{
      if(window.smartVillage?.handleAction){document.documentElement.dataset.smartVillageActions='ready';return;}
      if(window.smartVillage?.openModal||window.smartVillage?.serviceModal){document.documentElement.dataset.smartVillageActions='fallback';return;}
      setTimeout(probe,250);
    };
    probe();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
