# 🏎️ 3D Trafik Polisi Kovalamacası - Canlı Online Multiplayer Araba Oyunu

**Three.js (WebGL)**, **MQTT over WebSockets** ve **HTML5 / CSS3** ile geliştirilmiş, harici sunucu kurulumu gerektirmeden doğrudan **GitHub Pages** üzerinden oynanabilen canlı çok oyunculu 3D web araba oyunudur.

---

## 🌐 CANLI ONLİNE MOD ÖZELLİKLERİ

* **Ortak Toplanma Meydanı**: 
  - Giriş ekranında adını yazıp **"🌐 CANLI ONLİNE MOD"** butonuna basan herkes haritanın tam merkezindeki şehir meydanında (`x=0, z=0`) bir araya gelir!
* **3D İsim Etiketleri (Nametags)**:
  - Diğer tüm oyuncuların arabalarının üzerinde isimleri 3D olarak görünür.
* **Farklı Araba Renkleri**:
  - Oyuna giren her oyuncu rastgele özel bir renkle (Camgöbeği, Pembe, Neon Yeşil, Turuncu, Mor vb.) doğar.
* **Gerçek Zamanlı Senkronizasyon**:
  - Diğer arabaların sürüşü, tekerlek dönüşleri, yanan farları, **Q / E sinyalleri** ve duvara çarptıklarında çıkan dumanları canlı senkronize edilir.
* **📢 Canlı Korna (`H` Tuşu)**:
  - `H` tuşuna veya mobil ekrandaki Korna butonuna bastığında şehirdeki tüm oyuncular senin kornanı duyar ve arabanın üzerinde korna uyarısı belirir!
* **Canlı Sohbet (Chat)**:
  - Sol alttaki sohbet kutusuna yazıp `Enter` tuşuna basarak oyundaki diğer herkesle anlık konuşabilirsin.

---

## 🎮 Trafik Kuralları & Mekanikler

1. **Şerit ve Yol Takibi**: 
   - Arabanı asfalt yolda tutmalısın. Kaldırıma çıkarsan veya şeridi ihlal edersen ekranda **`⚠️ ŞERİT İHLALİ!`** uyarısı çıkar ve polisin aranma düzeyi artar.
2. **Sinyal Verme Zorunluluğu**: 
   - Dönüş yaparken **`Q` (Sol Sinyal)** veya **`E` (Sağ Sinyal)** tuşuna basarak sinyal vermen gerekir. Sinyalsiz dönersen polis ekipleri anında peşine düşer!
3. **3D Polis Takibi & Çakarlar**: 
   - Kural ihlalinde 3D polis arabası kırmızı-mavi tavan çakarlarını yakarak ve siren çalarak seni kovalamaya başlar. Seni kıstırıp yakalarsa **GAME OVER**!
4. **Duvara Çarpma & Motor Arızası**: 
   - 3D binalara çarptığında araba hasar alır, kıvılcımlar uçar ve kaputtan 3D dumanlar tütmeye başlar. Hasar %100 olduğunda motor tamamen yanar ve pert olur! *(Haritadaki yeşil 3D tamir çantalarıyla arabanı onarabilirsin).*
5. **Kazanma Şartı**: 
   - Şehirdeki **25 adet dönen 3D altın parayı** toplayarak polisten kaçmayı başar ve oyunu kazan!

---

## 🕹️ Kontroller

### Bilgisayar (Klavye):
* **W / Yukarı Ok:** Gaz (İleri)
* **S / Aşağı Ok:** Fren / Geri Vites
* **A / Sola Ok:** Sola Dönüş
* **D / Sağa Ok:** Sağa Dönüş
* **Q:** Sol 3D Sinyal
* **E:** Sağ 3D Sinyal
* **Space:** 3D Drift & El Freni
* **H:** Korna Çal (DÜÜT DÜÜT!)
* **C:** Kamera Açısı Değiştir (Arkadan Takip / 3D Kuş Bakışı)
* **Enter:** Sohbete (Chat) Odaklan

### Mobil (Telefon / Tablet):
* Ekranda beliren dokunmatik butonlar (Gaz, Fren, Drift, Direksiyon, Sol/Sağ Sinyal, Korna) ile rahatça oynayabilirsiniz.

---

## 🚀 GitHub Pages İle Herkese Açık ÜCRETSİZ Yayınlama

1. [github.com](https://github.com) sitesine girip **"New repository"** oluştur (Örn: `3d-online-araba-oyunu`).
2. Depoyu **Public** seçip oluştur.
3. Şu 4 dosyayı depoya yükle:
   - `index.html`
   - `style.css`
   - `game.js`
   - `README.md`
4. Deponun **Settings -> Pages** menüsüne gir.
5. **Branch** kısmını `main` (veya `master`) yapıp **Save** de.
6. 1-2 dakika sonra oyunun tüm dünyaya açık web adresi hazır:
   👉 **`https://<kullanici-adiniz>.github.io/3d-online-araba-oyunu/`**

Arkadaşlarına bu linki gönderdiğinde, herkes adını yazıp **"CANLI ONLİNE MOD"** butonuna basarak aynı şehir meydanında canlı olarak toplanabilir!
