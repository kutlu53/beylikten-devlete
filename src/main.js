/* Başlatıcı: ünite içeriğini yükler, giriş ekranını gösterir, harita kabuğunu başlatır. */
(async function () {
  const kok = document.getElementById('sahne');
  const M = Motor;
  let icerik;
  try {
    icerik = await M.icerikYukle('content/unite10-2.json', 'ICERIK_UNITE10_2');
  } catch (e) {
    kok.innerHTML = '<div class="kart"><h2>İçerik yüklenemedi</h2><p>' + e.message + '</p><p>content/unite10-2.json ve content/unite10-2.js dosyalarının yerinde olduğundan emin ol.</p></div>';
    return;
  }
  M.icerik = icerik;

  const kayit = Durum.yukle();
  const kayitVar = kayit && kayit.unite === icerik.unite && kayit.surum === 2;
  const g = icerik.giris || {};

  const basla = (durum) => {
    M.durum = durum;
    Durum.kaydet(durum);
    kok.innerHTML = '';
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); } catch (e) { /* tam ekran desteklenmiyor */ }
    Sahneler.harita(icerik, kok);
  };
  const yeniDurum = () => ({ surum: 2, unite: icerik.unite, gostergeler: {}, kararlar: {}, yapilar: [], bayraklar: {}, cevaplar: {}, gecmis: [], harita: null, baslangic: new Date().toISOString() });

  kok.innerHTML = '';
  kok.append(
    M.el('div', { class: 'giris' },
      M.el('div', { class: 'etiket' }, g.ustYazi || '10. Sınıf Tarih'),
      M.el('h1', null, g.baslik || 'Beylikten Devlete'),
      M.el('h2', null, icerik.unite + ' · ' + icerik.baslik + ' (' + icerik.donem + ')'),
      M.el('div', { class: 'alt', html: M.metin(g.aciklama) }),
      M.el('div', { class: 'buton-satiri' },
        kayitVar ? M.el('button', { onclick: () => basla(kayit) }, '▶ Kaldığın yerden devam et') : null,
        M.el('button', { class: kayitVar ? 'ikincil' : '', onclick: async () => {
          if (kayitVar) { const ok = await M.modal('Yeni oyun', '<p>Kayıtlı ilerleme silinecek. Devam edilsin mi?</p>', [{ metin: 'Evet', deger: true }, { metin: 'Vazgeç', deger: false }]); if (!ok) return; }
          Durum.sil(); basla(yeniDurum());
        } }, '✨ Yeni oyun')),
      g.altNot ? M.el('p', { class: 'ipucu', style: 'margin-top:2rem' }, g.altNot) : null)
  );
})();
