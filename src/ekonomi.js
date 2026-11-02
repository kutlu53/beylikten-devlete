/* Yıl sonu hesabı (dünya modu). İş üretimleri anlık uygulanmıştır; burada yapılar, haneler, misafir yükü,
   zorluklar, aşınma, ambar sınırı, refah kuralı, eşikler ve hedef işlenir. Günlüğe yazar, modal metni döndürür. */
const Ekonomi = {
  /* s: dunya/tur sahnesi, d: durum, tur: aktif tur, TD: tur durumu ({ atamalar, yapilanlar }) */
  yilSonu(s, d, tur, TD) {
    const M = Motor;
    const K = s.kurallar, Z = tur.zorluk || {}, A = s.kaynaklar.ikonlar;
    const gAd = (k) => M.icerik.gostergeAdlari[k] || k;
    const satirlar = [];
    const delta = { erzak: 0, gumus: 0 };
    const etki = {};
    const yilSonucu = { erzakYetti: true };
    const etkiEkle = (e, kat) => { Object.entries(e || {}).forEach(([k, v]) => etki[k] = (etki[k] || 0) + v * (kat || 1)); };

    if (Z.ad) satirlar.push((Z.ikon || '⚠️') + ' ' + Z.ad + ': ' + Z.aciklama);
    // Bu yıl yapılan işler (anlık uygulandı; rapor için)
    Object.entries(TD.atamalar || {}).forEach(([id, n]) => { if (n) satirlar.push((K.isler[id] || {}).ikon + ' ' + (K.isler[id] || {}).ad + ': ' + n + ' emek'); });
    // Yapılar
    d.yapilar.forEach(id => {
      const y = s.yapilar[id]; if (!y || !y.yillik) return;
      const parcalar = [];
      Object.entries(y.yillik.uretim || {}).forEach(([k, v]) => { delta[k] += v; parcalar.push('+' + v + ' ' + A[k]); });
      Object.entries(y.yillik.tuketim || {}).forEach(([k, v]) => { delta[k] -= v; parcalar.push('-' + v + ' ' + A[k]); });
      if (y.yillik.etki) { etkiEkle(y.yillik.etki); parcalar.push(Object.entries(y.yillik.etki).map(([k, v]) => gAd(k) + ' +' + v).join(', ')); }
      if (parcalar.length) satirlar.push(y.ikon + ' ' + y.ad + ': ' + parcalar.join(', '));
      if (d.bayraklar['bonus_' + id] && y.komsuBonus && y.komsuBonus.yillik) { Object.entries(y.komsuBonus.yillik).forEach(([k, v]) => { delta[k] += v; }); satirlar.push(y.ikon + ' ' + y.komsuBonus.metin); }
    });
    Object.values(d.yillikEkler || {}).forEach(ek => { Object.entries(ek.kaynak || {}).forEach(([k, v]) => { delta[k] += v; }); satirlar.push('🐪 ' + ek.metin + ': ' + Object.entries(ek.kaynak).map(([k, v]) => '+' + v + ' ' + A[k]).join(', ')); });
    const carpan = Z.tuketimCarpan || 1;
    const haneTuketim = Math.ceil(d.kaynaklar.haneler / (K.haneTuketimBolen || 2)) * carpan;
    delta.erzak -= haneTuketim; satirlar.push('🏘️ Haneler (' + d.kaynaklar.haneler + '): -' + haneTuketim + ' ' + A.erzak + (carpan > 1 ? ' (×' + carpan + ')' : ''));
    const misafir = Math.floor(d.gostergeler.guven / (K.misafirBolen || 50)) * carpan;
    if (misafir > 0) { delta.erzak -= misafir; satirlar.push('🚶 Yolcular ve misafirler: -' + misafir + ' ' + A.erzak + ' (Güven arttıkça gelen de artar)'); }
    Object.entries(Z.ekTuketim || {}).forEach(([k, v]) => { delta[k] -= v; satirlar.push((Z.ikon || '⚠️') + ' ' + Z.ad + ': -' + v + ' ' + A[k]); });
    if (K.yillikAsinma) { etkiEkle(K.yillikAsinma); satirlar.push('⏳ Yıllar geçiyor: ' + Object.entries(K.yillikAsinma).map(([k, v]) => gAd(k) + ' ' + v).join(', ') + ' (sofra, aşevi ve iyi komşuluk bunu dengeler)'); }

    let erzak = d.kaynaklar.erzak + delta.erzak;
    let gumus = d.kaynaklar.gumus + delta.gumus;
    if (erzak < 0) { satirlar.push('⚠️ Erzak yetmedi: sofra boş kaldı. Güven -5, Refah -5'); etkiEkle({ guven: -5, refah: -5 }); erzak = 0; yilSonucu.erzakYetti = false; }
    const kapasite = d.yapilar.includes('ambar') ? K.ambarKapasitesiAmbarla : K.ambarKapasitesi;
    if (erzak > kapasite) { satirlar.push('🐀 Ambar sınırı ' + kapasite + ': ' + (erzak - kapasite) + ' erzak çürüdü' + (d.yapilar.includes('ambar') ? '' : ' (ambar kurarsan sınır 24 olur)')); erzak = kapasite; }
    if (gumus < 0) gumus = 0;
    let refah;
    if (erzak >= 8 && gumus >= 4) { refah = 3; satirlar.push('📈 Ambar ve kese dolu: Refah +3'); }
    else if (erzak <= 2) { refah = -4; satirlar.push('📉 Ambar boşa yakın: Refah -4'); }
    else { refah = 1; satirlar.push('➡️ Geçim idare ediyor: Refah +1'); }
    etkiEkle({ refah });

    d.kaynaklar.erzak = erzak; d.kaynaklar.gumus = gumus;
    M.etkiUygula(etki, { tur: 'yil', baslik: tur.yil + ' yıl sonu', secim: 'üretim ve tüketim' });
    (K.esikler || []).forEach(e => {
      if (d.gostergeler[e.gosterge] < e.altinda) { M.kaynakUygula(e.kaynak); satirlar.push('🔻 ' + e.metin + ': ' + Object.entries(e.kaynak).map(([k, v]) => v + ' ' + A[k]).join(', ')); }
    });
    if (tur.hedef) {
      const basarildi = Ekonomi.hedefSagla(tur.hedef.kosul, yilSonucu);
      d.hedefler = d.hedefler || {};
      d.hedefler[tur.id] = { metin: tur.hedef.metin, basarildi };
      satirlar.push((basarildi ? '🎯 Hedef başarıldı: ' : '🎯 Hedef tutmadı: ') + tur.hedef.metin);
    }
    let g = d.gunluk.find(x => x.turId === tur.id);
    if (!g) { g = { turId: tur.id, yil: tur.yil, baslik: tur.baslik, satirlar: [] }; d.gunluk.push(g); }
    satirlar.forEach(x => g.satirlar.push(x));
    Durum.kaydet(d);
    const html = '<ul class="yil-sonu">' + satirlar.map(x => '<li' + (x.startsWith('🎯') ? ' class="hedef-satir ' + (x.includes('başarıldı') ? 'iyi' : 'kotu') + '"' : '') + '>' + x + '</li>').join('') + '</ul>' +
      '<p><b>Ambar:</b> ' + d.kaynaklar.erzak + ' ' + A.erzak + ' · <b>Kese:</b> ' + d.kaynaklar.gumus + ' ' + A.gumus + ' · <b>Hane:</b> ' + d.kaynaklar.haneler + '</p>';
    return { satirlar, yilSonucu, html };
  },

  hedefSagla(k, yilSonucu) {
    if (!k) return true;
    if (k.hepsi) return k.hepsi.every(x => Ekonomi.hedefSagla(x, yilSonucu));
    if (k.herhangi) return k.herhangi.some(x => Ekonomi.hedefSagla(x, yilSonucu));
    if (k.yil) return !!yilSonucu[k.yil];
    return Motor.kosulSagla(k);
  }
};
