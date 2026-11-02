# Beylikten Devlete: Osmanlı Tarih Oyunu

Bu dosya projenin amacını, tasarım kararlarını ve mevcut yapıyı anlatır. Claude Code bu dosyayı otomatik okur. Çalışmaya başlamadan önce tamamını oku; kararlar öğretmen (Sensei) ile tartışılıp netleştirilmiştir, bunları kendiliğinden değiştirme. Bir kararın işlemediğini düşünürsen öneri olarak sun.

Sürüm notu: İlk prototip (Ekim 2026 başı) "vakıf yerleşkesi + bölüm başına karakter" yapısındaydı. 26 Ekim 2026'da **tam ekran harita + olay başına mini oyun** yapısına geçildi. Bu dosya yeni yapıyı anlatır. Eski yapıya ait dosyalar için "Eski sürümler" bölümüne bak.

## 1. Amaç

Lise 10. sınıf Tarih dersinde (Türkiye Yüzyılı Maarif Modeli, 2024 programı), **2. Ünite: Beylikten Devlete Osmanlı (1299-1453)** kazanımlarını öğreten, **tarayıcıda sunucusuz çalışan 2D bir oyun**.

Uzun vadeli hedef: 1299'dan 1918'e uzanan seri. 10. sınıf 3. ünitesi (1453-1683) ve 11. sınıfın üç ünitesi (1683-1789, 1789-1908, 1908-1918) ayrı içerik dosyaları olarak eklenecek. **Şimdi yalnızca 10.2 ünitesi yapılıyor**; motor ve içerik formatı sonraki üniteler yalnızca yeni JSON ile eklenebilecek şekilde tasarlanmıştır. Tüm ünitelerin olay listesi ve mini oyun önerileri `docs/olay-listesi.md` dosyasındadır.

## 2. Hedef kazanımlar (MEB programı, 10. sınıf 2. ünite, 24 ders saati)

- **TAR.10.2.1** Osmanlı Devleti'nin kuruluşuna dair farklı görüşleri tartışabilme (Gibbons, Wittek, Köprülü, İnalcık; benzer/farklı ve güçlü/zayıf yönler; gerekçeyle kabul ya da çürütme)
- **TAR.10.2.2** 1299-1453 arası Anadolu ve Rumeli'deki siyasi ve askerî mücadeleleri yorumlayabilme (Koyunhisar, İznik, Bursa, Rumeli'ye geçiş, Edirne, I. Kosova, Ankara, II. Kosova)
- **TAR.10.2.3** Ordu, hukuk ve toprak sistemi ile devletleşme arasındaki ilişkiyi çözümleyebilme
- **TAR.10.2.4** Fethedilen topraklarda kalıcı olmak için izlenen politikaları (iskân, istimalet) sorgulayabilme
- **TAR.10.2.5** İlim ve irfan geleneğinin oluşmasında şehir, kurum ve şahsiyetlerin etkisine dair fikir üretebilme

**Anahtar kavramlar:** devşirme sistemi, irfan, iskân, istimalet, kapıkulu, Rumeli Türklüğü, tımar, vakıf.

**Programın önerdiği öğrenme kanıtları:** açıklamalı tarih şeridi, bilgi görseli, tarihsel kaynak/kanıt analiz formu, öz değerlendirme formu, gözlem formu, çözümlemeli/dijital öykü. Oyun bunları "ürün" olarak üretir (bkz. Bölüm 5).

Kaynak: https://mufredat.meb.gov.tr/Dosyalar/202582695425908-tarih.pdf ve https://tymm.meb.gov.tr/ogretim-programlari/tarih-dersi/12

## 3. Temel tasarım kararları (kesinleşti)

1. **Tarih değişmez, öğrenci yorumlar.** Programda adı geçen olaylar sabit bir zaman çubuğunda sırayla açılır. Öğrenci olayın sonucunu değiştiremez; olaya hazırlanır, nedenlerini sıralar, kaynakları karşılaştırır, tahmin eder ve not düşer. Kaybetme/kazanma yoktur; yanlış seçim değil, farklı yorum vardır. Yanlış eşleştirme nazikçe yönlendirilir.
2. **Ana mekân haritadır.** Tam ekran şematik Balkanlar-Anadolu haritası ve altında 1299-1453 zaman çubuğu. Her olay haritada bir işarettir; tamamlanan olaylar Osmanlı topraklarını büyütür. Olaylar sırayla açılır (bir önceki tamamlanmadan sonraki oynanmaz), tamamlananlar tekrar oynanabilir.
3. **Her olay bir mini oyundur.** Olay türüne göre yedi mini oyun tipinden biri kullanılır (Bölüm 5). Tüm etkileşim **sürükle-bırak** üzerine kuruludur; dokunmatik ekranda da çalışır, alternatif olarak "karta tıkla, sonra hedefe tıkla".
4. **Her mini oyun bir ürün üretir.** Tarih şeridi notu, kaynak analiz formu, tez savunması, dijital öykü taslağı gibi. Ürünler **Ürünlerim** panelinde birikir, kopyalanıp yazdırılabilir; öğretmene teslim bu yolla yapılır.
5. **Kaynak sorgulama her olayda vardır.** Tanıklık kartlarına güvenilirlik mührü basma, iki kaynağın çelişen cümlelerinde "farkı bul", ipuçlarını güvenilirliğe göre sıralama. Öğrenci hangi kaynağa ne kadar güveneceğine kendisi karar verir.
6. **Kurgu ile gerçek net ayrılır.** Tanıklar ve sözleri tamamen kurgusaldır; dönemin kaynaklarında anlatılan türden durumları temsil eder ve oyunda "kurgusal" olarak işaretlenir. Gerçek kişilere (Osman Bey, Orhan Bey, Şeyh Edebali, Davud-i Kayseri, Hacı Bayrâm-ı Velî vb.) uydurma söz atfedilmez. Her olayın sonunda **"Tarihte Ne Oldu"** kartı ve öğretmen doğrulama listesi gösterilir.
7. **2D, hafif, sunucusuz, çevrimdışı.** Okul bilgisayarları ve telefonlar hedef. `index.html` çift tıklanarak açılır (file://), internet gerekmez.
8. **İçerik ile motor ayrıdır.** Öğretmen yalnızca `content/unite10-2.json` dosyasını düzenler, kod yazmaz. Sonraki üniteler yalnızca yeni JSON ile eklenir.

Eski tasarımdan **kaldırılan** öğeler: vakıf yerleşkesi, Refah/İlim/Güven/Adalet göstergeleri, bölüm başına karakter hikâyesi, güncellenen vakfiye belgesi, tur döngüsü. Bunlar geri istenirse öğretmen kararıyla ve bir olayın mini oyunu olarak eklenebilir.

## 4. Olay listesi (10.2, 12 olay)

| # | Olay | Tarih | Kazanım | Mini oyun |
|---|---|---|---|---|
| 1 | Kuruluş: tarihçiler ne diyor? | 1299 (~1302) | 10.2.1 | tez |
| 2 | Koyunhisar (Bapheus) | ~1302 | 10.2.2 | savas |
| 3 | Bursa'nın Fethi | 1326 | 10.2.2 | abluka |
| 4 | İznik'in Fethi | 1331 | 10.2.2 | abluka |
| 5 | Devletleşme: ordu, hukuk, toprak | 1330'lar | 10.2.3 | esle |
| 6 | Rumeli'ye geçiş (Çimpe, Gelibolu) | 1352-1354 | 10.2.2, 10.2.4 | iskan |
| 7 | Edirne'nin Fethi | ~1361-1369 | 10.2.2 | dedektif |
| 8 | I. Kosova | 1389 | 10.2.2 | savas |
| 9 | Devşirme ve kapıkulu | 14. yy sonu | 10.2.3 | esle |
| 10 | Ankara Savaşı ve Fetret | 1402 | 10.2.2 | savas (yenilgi) |
| 11 | II. Kosova | 1448 | 10.2.2 | savas |
| 12 | İlim ve irfan | 1300-1453 | 10.2.5 | esle + dijital öykü |

Programın "Öğretme-Öğrenme Uygulamaları" bölümünde adıyla sayılan sekiz olay ve beş kazanımın tamamı kapsanır.

## 5. Mini oyun tipleri (`src/mini.js`, `miniOyun.tip` alanına göre)

- **tez** (10.2.1): 12 kurgusal tanıklık kartını dört tarihçi sütununa sürükle (her bırakışta tarihçi yorumu belirir); her karta güvenilirlik mührü bas; bir tezi en az iki destekleyen ve bir zayıflatan kartla savun; üç gerekçe yaz. Ürün: kaynak analiz formu + tez.
- **savas** (10.2.2): üç birliği (gözcü, atlı, elçi) savaş haritasındaki bölgelere sürükle, her bölge bir "neden" kartı verir; sabit savaşı animasyonla izle; neden kartlarını önem sırasına sürükle ve gerekçele; iki kaynağın çelişen cümlelerini "farkı bul" ile seç; sonucu tahmin et, tarih şeridine not düş. Ürün: tarihsel bakış açısı formu + şerit notu.
- **abluka**: şehre giren beş ikmal yolundan dördüne karargâh sürükle; açık kalan yolun etkisini gör (deniz/göl iskelesi açık kalırsa abluka uzar). Ardından kaynak sorusu ve şerit notu.
- **esle**: kavram, aşama ya da şahsiyet kartlarını kutulara sürükle; yanlış kutuda nazik yönlendirme; sistemler arası bağ sorusu; ilim-irfanda bir şahsiyet için üç cümlelik dijital öykü taslağı.
- **iskan**: Türkmen aile gruplarını ve derviş zaviyelerini Gelibolu çevresindeki boş ve yerli köylere yerleştir; iskân ile istimaletin farkını gör.
- **dedektif**: dört ipucunu güvenilirliğe göre sırala, fetih yılını kaydırıcıda tahmin et, tartışmanın nedenini açıkla.
- **okuma**: yedek tip; özet, kaynak sorusu, tarih şeridi notu. Yeni bir olay için mini oyun henüz yazılmadıysa bu tip kullanılır.

Her olayın akışı: haritada işarete tıkla → sağ panelde özet, kazanım kodu, görev → **Oyna** → mini oyun (2-4 adım) → ürün kaydı → **Tarihte Ne Oldu** kartı → sonraki olay açılır.

## 6. Dosya yapısı

- `index.html`: tek sayfa; `content/unite10-2.js` ve `src/*.js` dosyalarını sırayla yükler.
- `src/main.js`: içeriği yükler (`Motor.icerikYukle`: önce fetch ile JSON, file:// ise `window.ICERIK_UNITE10_2` yedeği), giriş ekranını çizer, kayıt varsa "kaldığın yerden devam" sunar, `Sahneler.harita` ile harita kabuğunu başlatır.
- `src/harita.js`: harita kabuğu (SVG harita, zaman çubuğu, olay paneli, mini oyun başlatma, Tarihte Ne Oldu, Ürünlerim, yardım, tam ekran, yeni oyun).
- `src/mini.js`: `MiniOyunlar` nesnesi; tip adı → `(olay, icerik, onBitti)` fonksiyonu. Ortak sürükle-bırak yardımcısı (`Surukle.kart`, `Surukle.hedef`) ve adımlı kaplama burada.
- `src/motor.js`: `Motor` yardımcıları (`el`, `metin`, `modal`, `icerikYukle`, `icerik`, `durum`).
- `src/durum.js`: `Durum.kaydet / yukle / sil` (localStorage, try/catch içinde; başarısız olursa oyun yine çalışır). İçindeki `yeni` fonksiyonu eski yapıya aittir, `main.js` kendi durum nesnesini kurar.
- `src/sahneler.js`: eski sahne çiziciler; yalnızca `Sahneler` nesnesi ve bazı yardımcılar kullanılır.
- `src/stil.css`: tüm stiller (harita, mini oyunlar, yazdırma, dar ekran kuralları).
- `content/unite10-2.json`: ünitenin tüm içeriği (aşağıda). `content/unite10-2.js`: JSON'un otomatik üretilen yedeği, elle düzenlenmez.
- `araclar/icerik-derle.ps1`: JSON'u .js yedeğine çevirir. JSON düzenlendikten sonra çalıştırılır: `powershell -ExecutionPolicy Bypass -File araclar\icerik-derle.ps1`
- `docs/olay-listesi.md`: 10.2'den 11.3'e tüm ünitelerin olay, tarih, kazanım ve mini oyun önerisi tablosu.
- `README.md`: kullanıcı ve öğretmen için açıklama.

### Durum nesnesi (`Motor.durum`, localStorage anahtarı `buyuyenVakif_v1`)

`{ surum: 2, unite, gostergeler: {}, kararlar: {}, yapilar: [], bayraklar: {}, cevaplar: {}, gecmis: [], harita: { acik, tamam: {olayId: true}, urunler: {olayId: {ad, yil, kazanim, ...sonuc}}, secili }, baslangic }`. `surum` eşleşmezse kayıt yok sayılır. `gostergeler`, `kararlar`, `yapilar` eski yapıdan kalan boş alanlardır.

### İçerik dosyası alanları (`content/unite10-2.json`)

Üst düzey: `unite`, `baslik`, `donem`, `giris` (ustYazi, baslik, aciklama, altNot), `harita`, `tezler`, `nedenler`, `olaylar`.

- `harita.karalar`: basitleştirilmiş kıyı çizgileri (SVG path). Enlem-boylamdan doğrusal izdüşüm: x = (boylam-19)/26·1000, y = (46-enlem)/11·600. `harita.yerler`: id, ad, x, y. `harita.topraklar`: `acilis` (hangi olay tamamlanınca açılır), `nufuz` (kesikli nüfuz alanı). Şekiller yaklaşıktır.
- Olay başına ortak alanlar: `id`, `yil`, `yilSayi` (zaman çubuğu), `kisaYil` (işaret etiketi), `ad`, `yer`, `pin` ([x, y]), `kazanim`, `ozet`, `gorev`, `miniOyun.tip`, `tarihte` (Tarihte Ne Oldu maddeleri), `dogrulama` (öğretmen kontrol listesi).
- Tipe özel veriler **olayın kendi alanlarında** durur, `miniOyun` içinde değil: `tez` → `tanikler`, `tezSorulari`; `savas` → `hazirliklar`, `savasAdimlari`, `yorum`, `kaynaklar`, `farklar`, `kaynakSorulari`, `tahmin`, `seritNotu`, isteğe bağlı `nedenler` (yoksa üst düzey `nedenler` kullanılır); `abluka` → `abluka.yollar`, `karargah`, `kaynakSorusu`, `seritNotu`; `esle` → `esle.hedefler`, `esle.kartlar`, `esle.bag`, isteğe bağlı `esle.oyku`, `kavramlar`/`sahsiyetler`; `iskan` → `iskan.yerler`, `iskan.parcalar`, `iskan.degerlendirme`, `iskan.soru`; `dedektif` → `dedektif.ipuclari` (guven 1-3), `aralik`, `kabul`, `soru`; `okuma` → `kavramlar`, `kaynakSorusu`, `seritNotu`.

Yeni bir ünite eklemek için: `content/uniteX-Y.json` yaz, `icerik-derle.ps1` çalıştır, `index.html` ve `main.js`'de dosya adı ile `ICERIK_` anahtarını değiştir (ileride ünite seçim ekranı eklenebilir), gerekirse `harita.karalar`ı genişlet.

## 7. Teknik gereksinimler

- **Platform:** Tarayıcı, tek sayfa HTML/CSS/JavaScript, framework yok, derleme adımı yok. Harita ve mini oyun sahneleri SVG + DOM. İleride PWA'ya taşınabilir olmalı.
- **Sunucusuz:** file:// ile açılabilmeli; bu yüzden JSON'un .js yedeği şarttır. Fetch çalışmazsa yedek kullanılır.
- **Erişilebilirlik ve okunabilirlik:** büyük okunabilir font, yüksek kontrast, UTF-8 Türkçe karakter desteği. Ekran 1280x720 ve üzeri öncelikli; telefonda kullanılabilir düzen ikinci öncelik (CSS'de dar ekran kuralları var). Sürükle-bırakın tıkla-tıkla alternatifi her zaman korunmalı.
- **Görseller:** vektör/CSS/emoji tabanlı yer tutucular. Telifli görsel, minyatür veya gerçek eser kopyası kullanılmaz.
- **Yazdırma:** `@media print` ile yalnızca Ürünlerim içeriği basılır.

## 8. İçerik ve ton kuralları

- **Dil:** Türkçe; 15-16 yaş düzeyine uygun, sade ama dönemin kavramlarını doğru kullanan anlatım. Anahtar kavramlar ilk geçtiği yerde kısa açıklamayla verilir.
- **Tarihsel doğruluk:** Emin olunmayan tarih, isim veya ayrıntı uydurulmaz; "~" ile işaretlenir ya da olayın `dogrulama` listesine eklenir. Tarihçi görüşleri kısa ve temkinli özetlenir, kesin hüküm yazılmaz. Kaynak özetleri (Pachymeres, Âşıkpaşazâde vb.) özgün anlatımla, uzun alıntı yapılmadan verilir.
- **Kurgu işareti:** Tanıklar ve kurgusal örnekler açıkça kurgusal olarak etiketlenir. Gerçek kişilere söz atfedilmez.
- **Değerler:** Adalet, çalışkanlık, sabır, merhamet. Ahlaki yargı dayatılmaz; sonuç sonrası gerekçe gösterilir.
- **Kapsayıcılık:** Kadınlar (aile, hukuk, vakıf yönetimi; Bâciyân-ı Rum), yerli halk ve farklı meslekler olaylarda görünür olmalı.
- **Telif:** Kaynak metinlerden uzun alıntı yapılmaz; özgün anlatım yazılır.

## 9. Çalışma yöntemi (Claude Code için)

1. Önce bu dosyayı oku, sonra kısa bir plan sun ve onay al.
2. İçerik değişikliğinde yalnızca JSON'u düzenle, ardından `icerik-derle.ps1` çalıştır ya da kullanıcıya çalıştırmasını söyle.
3. Yeni mini oyun tipi eklerken `MiniOyunlar` nesnesine `(olay, icerik, onBitti)` imzalı fonksiyon ekle, `harita.js`'deki tip açıklama sözlüğünü ve README'yi güncelle; `onBitti`'ye ürün nesnesini geçir.
4. Her adımdan sonra çalışır durumda bırak; `index.html` çift tıklanarak açılır. Doğrulama için başsız Chrome ile ekran görüntüsü alınabilir.
5. Tarihsel içerik yazarken emin olmadığın noktaları olayın `dogrulama` listesine ekle; öğretmen doğrulasın.
6. Kapsam dışına çıkma (sonraki üniteler, hesap sistemi, öğretmen paneli, ses) ve tasarım kararlarını (Bölüm 3) değiştirme.

## 10. Bilinen eksikler ve sonraki adımlar

- **Öğrenme kanıtlarından eksik olanlar:** öz değerlendirme formu, gözlem formu, bilgi görseli (infografik). Program bunları da istiyor; ünite sonunda ya da ilgili olayın ürününe eklenebilir.
- **Ünite sonu ekranı yok:** 12/12 tamamlanınca toplu özet/teslim ekranı yok, yalnızca Ürünlerim paneli var.
- **İçerik doğrulaması bekliyor:** her olayın `dogrulama` listesi (Koyunhisar yeri ve tarihi, dört tarihçinin özetleri, Bursa/Pelekanon/Edirne tarihleri, yeniçeri ocağı kuruluşu, Fetret'in bitişi, şahsiyet notları).
- **Sınıf denemesi:** hangi mini oyun sıkıcı, hangisi işe yarıyor?
- **Sonraki üniteler:** 10.3 için `content/unite10-3.json`, harita genişletmesi (Orta Doğu, Orta Avrupa, Akdeniz), yeni mini oyun tipleri (antlaşma masası, kuşatma mühendisliği, muhacir yerleştirme).
- **PWA ve çevrimdışı kurulum**, ses/müzik, mobil cila, öğretmen paneli: kapsam dışı, sonra.

## 11. Eski sürümler

`src/tur.js`, `src/dunya.js`, `src/piksel.js`, `src/bolge.js`, `src/ekonomi.js`, `content/bolum1.json` ve `content/bolum1.js` ilk prototiplere (vakıf yerleşkesi, tur döngüsü, Stardew tarzı dünya) aittir. `index.html` bunları yüklemez. İstenirse silinebilir ya da ileride bir olayın mini oyunu olarak geri çağrılabilir. Bu dosyalara dokunmadan önce öğretmene sor.
