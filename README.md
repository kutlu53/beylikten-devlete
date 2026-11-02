# Beylikten Devlete — Osmanlı Tarih Oyunu (10.2 ünitesi)

Türkiye Yüzyılı Maarif Modeli 10. sınıf Tarih dersi, 2. ünite (Beylikten Devlete Osmanlı, 1299-1453) için tarayıcıda çalışan, sunucusuz oyun. Tam ekran şematik harita üzerinde programın saydığı olaylar sırayla açılır; her olay bir mini oyunla oynanır ve bir öğrenme kanıtı (ürün) üretir.

## Nasıl açılır

`index.html` dosyasına çift tıklayın. İnternet ve sunucu gerekmez; oyun başlarken tam ekrana geçer (⛶ ya da F11 ile açılıp kapanır).

## Yapı

- **Harita kabuğu** (`src/harita.js`): şematik Balkanlar-Anadolu haritası, altta 1299-1453 zaman çubuğu, 12 olay işareti. Olaylar sırayla açılır; tamamlanan olaylar Osmanlı topraklarını haritada büyütür. Sağ panelde özet, kazanım kodu, görev ve **Oyna** düğmesi. **Ürünlerim** tüm ürünleri toplar (kopyala / yazdır).
- **Etkileşim**: tüm mini oyunlar sürükle-bırak üzerine kurulu (dokunmatik ekranda da çalışır; alternatif olarak karta tıkla, sonra hedefe tıkla).
- **Mini oyunlar** (`src/mini.js`), olayın `miniOyun.tip` alanına göre:
  - `tez` (10.2.1): 12 kurgusal tanıklık kartını dört tarihçi sütununa sürükle (her bırakışta tarihçi yorumu belirir), her karta güvenilirlik mührü bas, bir tezi en az iki destekleyen ve bir zayıflatan kartla savun, üç gerekçe yaz. Ürün: kaynak analiz formu + tez.
  - `savas` (10.2.2; Koyunhisar, I. Kosova, Ankara, II. Kosova): üç birliği (gözcü, atlı, elçi) savaş haritasındaki bölgelere sürükle, her bölge bir "neden" kartı verir; sabit savaşı animasyonla izle (Ankara'da yenilgi); neden kartlarını önem sırasına sürükle ve gerekçele; iki kaynağın çelişen cümlelerini "farkı bul" ile seç; sonucu tahmin et, tarih şeridine not düş. Ürün: tarihsel bakış açısı formu + şerit notu.
  - `abluka` (Bursa, İznik): şehre giren beş ikmal yolundan dördüne karargâh sürükle; açık bırakılan yolun etkisini gör (deniz/göl iskelesi açık kalırsa abluka uzar). Ardından kaynak sorusu ve şerit notu.
  - `esle` (devletleşme sistemleri, devşirme, ilim-irfan): kavram, aşama ya da şahsiyet kartlarını kutulara sürükle; yanlış kutuda nazik yönlendirme; ardından sistemler arası bağ sorusu; ilim-irfanda bir şahsiyet için üç cümlelik dijital öykü taslağı.
  - `iskan` (Rumeli'ye geçiş): Türkmen aile gruplarını ve derviş zaviyelerini Gelibolu çevresindeki boş ve yerli köylere yerleştir; iskân ile istimaletin farkını gör.
  - `dedektif` (Edirne): dört ipucunu güvenilirliğe göre sırala, fetih yılını kaydırıcıda tahmin et, tartışmanın nedenini açıkla.
  - `okuma`: yedek tip; özet, kaynak sorusu, tarih şeridi notu.
- **İçerik** (`content/unite10-2.json`): harita geometrisi, yerler, toprak katmanları, tezler, nedenler ve 12 olay. Öğretmen yalnızca bu dosyayı düzenler; kaydedince `araclar\icerik-derle.ps1` çalıştırılır (çift tıklayarak açılan sayfa için gerekli).
- **Ortak motor**: `src/motor.js` (modal, metin, yardımcılar), `src/durum.js` (localStorage kaydı), `src/sahneler.js` (eski sahne çiziciler; yalnızca yardımcıları kullanılır).

Olay listesi ve sonraki ünitelerin planı: `docs/olay-listesi.md`.

## Olay listesi (10.2)

1. 1299 Kuruluş: tarihçiler ne diyor? (tez) · 2. ~1302 Koyunhisar (savaş) · 3. 1326 Bursa (abluka) · 4. 1331 İznik (abluka) · 5. 1330'lar Devletleşme (eşle) · 6. 1352-54 Rumeli'ye geçiş (iskân) · 7. ~1361-69 Edirne (dedektif) · 8. 1389 I. Kosova (savaş) · 9. 14. yy sonu Devşirme (eşle) · 10. 1402 Ankara ve Fetret (savaş, yenilgi) · 11. 1448 II. Kosova (savaş) · 12. İlim ve irfan (eşle + dijital öykü).

Programın "Öğretme-Öğrenme Uygulamaları" bölümünde adıyla sayılan sekiz olay (Koyunhisar, İznik, Bursa, Rumeli'ye geçiş, Edirne, I. Kosova, Ankara, II. Kosova) ve beş kazanımın tamamı kapsanır.

## İçerik alanları (olay başına)

`id`, `yil`, `yilSayi` (zaman çubuğu), `kisaYil` (işaret etiketi), `ad`, `yer` (harita yerleri), `pin` ([x, y] işaret konumu), `kazanim`, `ozet`, `gorev`, `miniOyun.tip`, `tarihte` (Tarihte Ne Oldu maddeleri), `dogrulama` (öğretmen kontrol listesi).
- `okuma`: `kavramlar`, `sahsiyetler`, `kaynakSorusu` (secenekler + geriBildirim), `seritNotu`.
- `tez`: `tanikler` (ad, avatar, kim, nerede, zaman, tur, metin, tezler, cikar, aciklama), `tezSorulari`.
- `savas`: `hazirliklar` (neden kartı verir), `savasAdimlari`, `yorum`, `kaynaklar`, `kaynakSorulari`, `tahmin`, `seritNotu`.
- `abluka`: `abluka.yollar` (ilk yol deniz/göl), `karargah` sayısı. `esle`: `hedefler`, `kartlar` (hedef, aciklama), `bag` sorusu, isteğe bağlı `oyku`. `iskan`: `yerler` (tip: bos/yerli), `parcalar`, `degerlendirme`, `soru`. `dedektif`: `ipuclari` (guven 1-3), `aralik`, `kabul`, `soru`.
- Harita: `harita.karalar` basitleştirilmiş kıyı çizgileri (enlem-boylamdan doğrusal izdüşüm: x = (boylam-19)/26·1000, y = (46-enlem)/11·600), `harita.yerler`, `harita.topraklar` (`acilis`: hangi olay tamamlanınca açılır; `nufuz`: kesikli nüfuz alanı). Toprak şekilleri yaklaşıktır.

## Öğretmen doğrulaması gereken noktalar

Her olayın `dogrulama` listesi "Tarihte Ne Oldu" kartında da görünür. Başlıcaları:
1. Koyunhisar'ın yeri ve tarihi; Pachymeres ve Âşıkpaşazâde özetleri (Alan paralı askerleri, Muzalon, Aydoğdu'nun şehadeti ayrıntıları özetlerde adıyla geçmez, öğretmen eklemek isteyebilir).
2. Dört tarihçinin görüş özetleri.
3. Bursa ablukasının başlangıcı, Osman Bey'in vefat yılı, Pelekanon tarihi, Edirne'nin fetih tarihi aralığı, yeniçeri ocağının kuruluş tarihi, Fetret'in bitişi.
4. Şahsiyet notları (Dursun Fakih rivayeti, Emir Sultan, Hacı Bayrâm-ı Velî).
5. Tanıklar ve sözleri tamamen kurgusaldır; dönemin kaynaklarında anlatılan türden durumları temsil eder. Gerçek kişilere söz atfedilmez.
6. Harita şematiktir; sınırlar ve toprak katmanları yaklaşık gösterimdir.

## Eski sürümler

`src/tur.js`, `src/dunya.js`, `src/piksel.js`, `src/bolge.js`, `src/ekonomi.js` ve `content/bolum1.json` önceki prototiplere (vakıf yerleşkesi, tur döngüsü, Stardew tarzı dünya) aittir; artık `index.html` tarafından yüklenmez. İstenirse silinebilir ya da ileride bir olayın mini oyunu olarak geri çağrılabilir. `CLAUDE.md` yeni yapıyı (harita + olay başına mini oyun) anlatır ve Claude Code için çalışma kurallarını içerir.

## Sonraki adımlar

- Antlaşma masası, kuşatma mühendisliği (1453), muhacir yerleştirme gibi sonraki ünitelerin mini oyun tipleri.
- 10.3 ünitesi (1453-1683) için `content/unite10-3.json` ve harita genişletmesi (Orta Doğu, Orta Avrupa, Akdeniz).
- Sınıf denemesi ve içerik doğrulaması.
