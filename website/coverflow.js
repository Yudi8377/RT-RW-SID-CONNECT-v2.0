(() => {
  'use strict';
  const root = document.querySelector('[data-coverflow]');
  if (!root) return;
  const cards = Array.from(root.querySelectorAll('.sv-cf-card'));
  const dots = Array.from(document.querySelectorAll('.sv-cf-dots [data-go]'));
  const title = document.querySelector('[data-cf-title]');
  const description = document.querySelector('[data-cf-description]');
  const current = document.querySelector('[data-cf-current]');
  const link = document.querySelector('[data-cf-link]');
  const features = [
    {title:'Layanan Warga',description:'Permohonan, pengaduan, dan informasi lingkungan.',href:'#layanan',label:'Jelajahi layanan'},
    {title:'Peta Wilayah',description:'Kenali batas wilayah dan fasilitas publik.',href:'#desa',label:'Lihat wilayah'},
    {title:'Kabar Desa',description:'Pengumuman dan kabar penting dalam satu ruang.',href:'#news',label:'Baca kabar desa'},
    {title:'Potensi Wilayah',description:'Kenalkan usaha dan potensi ekonomi warga.',href:'#ekonomi',label:'Jelajahi ekonomi lokal'},
    {title:'RT → RW → Desa',description:'Alur verifikasi wilayah yang terstruktur.',href:'#desa',label:'Pelajari tata kelola'}
  ];
  let active = 0;
  const wrap = n => (n + cards.length) % cards.length;
  function render(next) {
    active = wrap(next);
    cards.forEach((card, i) => {
      const delta = (i - active + cards.length) % cards.length;
      card.classList.remove('is-active','is-prev','is-next','is-far-prev','is-far-next');
      if (delta === 0) card.classList.add('is-active');
      else if (delta === 1) card.classList.add('is-next');
      else if (delta === cards.length - 1) card.classList.add('is-prev');
      else if (delta === 2) card.classList.add('is-far-next');
      else card.classList.add('is-far-prev');
      card.setAttribute('aria-current', i === active ? 'true' : 'false');
      card.tabIndex = i === active ? 0 : -1;
    });
    dots.forEach((dot, i) => { dot.classList.toggle('is-active', i === active); dot.setAttribute('aria-pressed', i === active ? 'true' : 'false'); });
    const feature = features[active];
    if (title) title.textContent = feature.title;
    if (description) description.textContent = feature.description;
    if (current) current.textContent = String(active + 1).padStart(2, '0');
    if (link) { link.href = feature.href; link.innerHTML = feature.label + ' <i class="bi bi-arrow-up-right" aria-hidden="true"></i>'; }
  }
  root.querySelector('.sv-cf-prev')?.addEventListener('click', () => render(active - 1));
  root.querySelector('.sv-cf-next')?.addEventListener('click', () => render(active + 1));
  dots.forEach(dot => dot.addEventListener('click', () => render(Number(dot.dataset.go))));
  cards.forEach((card, i) => {
    card.addEventListener('click', () => render(i));
    card.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); render(active - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); render(active + 1); }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); render(i); }
    });
  });
  const stage = root.querySelector('.sv-cf-stage');
  stage?.addEventListener('keydown', event => {
    if (event.target !== stage) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); render(active - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); render(active + 1); }
  });
  let startX = null;
  stage?.addEventListener('touchstart', event => { startX = event.changedTouches[0]?.clientX ?? null; }, {passive:true});
  stage?.addEventListener('touchend', event => {
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    if (Math.abs(endX - startX) > 45) render(active + (endX < startX ? 1 : -1));
    startX = null;
  }, {passive:true});
  render(0);
})();