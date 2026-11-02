/* Oyun durumu: tek nesne. localStorage'a kaydedilir; başarısız olursa oyun yine çalışır. */
const Durum = (() => {
  const ANAHTAR = 'buyuyenVakif_v1';

  function yeni(icerik) {
    return {
      surum: 1,
      bolum: icerik.bolum,
      sahneIndex: 0,
      gostergeler: Object.assign({}, icerik.baslangicGostergeleri),
      kararlar: {},     // kararId -> { secimId, etiket, etki }
      yapilar: ['zaviye'],
      bayraklar: {},    // serbest anahtar/değer (örn. hazirlik: "yarali")
      cevaplar: {},     // soruId -> metin veya seçim
      gecmis: [],       // { sahne, baslik, secim, etki }
      gunluk: [],       // yıl yıl günlük: { yil, baslik, satirlar[] }
      kaynaklar: null,  // tur sahnesi başlatır: { erzak, gumus, haneler }
      yerlesim: {},     // yapı -> {x,y}
      tarlalar: [],     // [{x,y}]
      baslangic: new Date().toISOString()
    };
  }

  function kaydet(d) {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); } catch (e) { /* sessiz */ }
  }

  function yukle() {
    try {
      const s = localStorage.getItem(ANAHTAR);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  function sil() {
    try { localStorage.removeItem(ANAHTAR); } catch (e) { /* sessiz */ }
  }

  return { yeni, kaydet, yukle, sil };
})();
