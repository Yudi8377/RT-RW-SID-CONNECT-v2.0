(()=>{
  const installFallback=()=>{
    if(window.__SMART_VILLAGE_ACTION_GUARD__) return;
    window.__SMART_VILLAGE_ACTION_GUARD__=true;
    const s=window.smartVillage||{};
    const open=s.openModal;
    const service=s.serviceModal;
    const fallback=(action)=>{
      if(action==='services'&&service){service();return;}
      if(action==='population'||action==='complaint'||action==='letter'||action==='activities'||action==='tracking'||action==='public-data'){
        if(service){service(action);return;}
      }
      if(!open)return;
      const titles={news:'NEWS ENGINE',article:'ARTIKEL',dashboard:'DASHBOARD PUBLIK',gis:'GIS DESA',privacy:'PRINSIP DATA',login:'MASUK WARGA',chat:'RUANG WARGA',agenda:'AGENDA WARGA',economy:'JOLIE BUSINESS OS'};
      const copies={news:'Berita dan informasi publik.',article:'Konten editorial lengkap.',dashboard:'Indikator publik agregat.',gis:'Peta publik dengan batas data aman.',privacy:'Transparansi sumber, klasifikasi, dan penggunaan data.',login:'Masuk ke SIM RT/RW untuk layanan personal.',chat:'Ruang komunikasi warga.',agenda:'Kalender kegiatan warga.',economy:'Direktori ekonomi lokal Smart Village.'};
      open('<span class="eyebrow dark">SMART VILLAGE</span><h2 class="modal-title">'+(titles[action]||'SMART VILLAGE')+'</h2><p class="modal-copy">'+(copies[action]||'Ruang digital desa.')+'</p><div class="modal-cta"><button class="btn btn-outline-civic" data-menu-main>Menu utama</button><button class="btn btn-outline-civic" data-home>Home</button></div>');
    };
    document.addEventListener('click',e=>{
      const el=e.target.closest?.('[data-action]');
      if(!el)return;
      e.preventDefault();e.stopImmediatePropagation();
      try{fallback(el.dataset.action)}catch(err){console.error('Smart Village action guard error',err)}
    },true);
  };
  const selfTest=()=>{
    const probe=document.createElement('button');
    probe.type='button';probe.setAttribute('data-action','services');probe.setAttribute('aria-hidden','true');probe.style.cssText='position:fixed;left:-99999px;top:-99999px;opacity:0;pointer-events:none';
    document.body.appendChild(probe);
    const modal=document.getElementById('actionModal');
    const before=modal?.classList.contains('show');
    probe.click();
    const passed=!!modal&&!before&&modal.classList.contains('show');
    if(passed){modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');}
    probe.remove();
    if(!passed)installFallback();
    else window.__SMART_VILLAGE_ACTION_GUARD__='healthy';
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',selfTest,{once:true});else setTimeout(selfTest,0);
})();
