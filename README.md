# NOVA TV

LG webOS TV için Türkçe, Magic Remote ve yön tuşlarıyla kullanılabilen NOVA TV IPTV arayüzü. Ana sayfa, canlı kanallar, filmler, diziler, arama, favoriler, M3U ve Xtream uyumlu portal girişi içerir.

## Çalıştırma

```sh
npm install
npm run dev
npm run build
```

Üretim çıktısı `dist/` klasöründedir. Statik uygulamadır; sunucu hesabı gerekmez. İlk açılışta arayüzü göstermek için örnek katalog görünür. Ayarlar bölümünden kendi M3U listenizi veya portal hesabınızı eklediğinizde ana sayfa ve katalog ekranları gerçek listenize geçer; örnek film ve kanallar artık gösterilmez. Liste, büyük kataloglarda TV belleğini zorlamamak için IndexedDB içinde parçalara ayrılarak saklanır. Liste adreslerindeki erişim bilgileri aynı cihazda saklanır.

## LG TV kurulumu

Hedef: webOS TV 22 ve üzeri (Chromium 87 tabanı). Developer Mode ile gerçek TV’ye kurulmuştur; codec ve dil parçası desteği modele ve yayına göre değişir. TV'de Developer Mode ve LG webOS CLI kurulumu sonrasında:

```sh
npm run package:webos
ares-install --device TV releases/com.mbirinci.tv_1.6.3_all.ipk
ares-launch --device TV com.mbirinci.tv
```

`TV` önceden yapılandırdığınız cihaz adıdır. TV paketi `dist-webos/` içindeki klasik JavaScript derlemesinden üretilir; `file://` açılışı test edilir. Vite kodu zaten küçülttüğü için CLI'ın eski küçültücüsü `--no-minify` ile atlanır. webOS manifesti ve 512×512 kaynaklı simge derlemeye dahildir. Ok tuşları odak hareketi, OK seçim, geri tuşu (461) pencere kapatma / ana sayfaya dönüş içindir. TV modeline göre HLS ve codec desteği değişir. Tarayıcı oynatımı HLS.js, TV destekliyorsa yerleşik HLS kullanır. URL listeleri ve tarayıcıdaki HLS parçaları sunucuda CORS izni gerektirebilir. DRM ve EPG kapsam dışındadır.

## Ses dili / Dublaj (1.1.0)

Yayın açıldığında oynatıcının altında mevcut ses seçenekleri gösterilir. HLS.js için `audioTracks` / `audioTrack`, yerleşik TV oynatıcısı için `video.audioTracks` / `enabled` kullanılır. Seçilen dil cihazda hatırlanır ve sonraki yayında varsa uygulanır. Dil sunulmuyorsa uydurma dublaj seçeneği gösterilmez. Dublaj ayrıca sağlanan bir film URL'siyse onun ayrı katalog kaydı seçilmelidir; uygulama harici dublaj üretmez veya bulmaz. Ekranı Büyüt düğmesi ses menüsünü erişilebilir tutar.

`npm run test:audio`: Yerleşik ve HLS adaptörlerini test çiftleriyle sınar; ses değiştirme, dil hatırlama, parça listesi değişimi, odak, tek/boş liste, dinleyici temizliği ve TV derlemesinin diskten açılışı kontrol edilir. Gerçek çok sesli yayının TV üzerinde işitsel doğrulaması ayrıca gerekir.

## NOVA TV ayarları (1.2.0)

Ayarlar ekranında iki bağlantı yöntemi vardır: M3U/M3U8 adresi veya dosyası, ayrıca Xtream uyumlu portal + kullanıcı adı + şifre. Portal girişi `player_api.php` ile hesap durumunu ve `exp_date` alanını sorgular; mevcutsa abonelik bitiş tarihi Ayarlar ekranında gösterilir. Sağlayıcı bu alanı vermiyorsa “Sağlayıcı bildirmedi” yazılır. Kullanıcının verdiği URL biçimi (`get.php?...`) doğrudan çalışır; uygulama sunucu kökünü çıkarıp hesap kontrolünü ayrıca yapar. İsteklerin başarılı olması için sağlayıcının TV tarayıcısına CORS izni vermesi gerekir.

Magic Remote’un işaretçi tıklaması, tekerlekle kaydırması ve beş yönlü ok/OK kullanımı desteklenir. Ok tuşlarında görünür odak halkası, geri tuşunda modal kapatma ve ana sayfaya dönme davranışı vardır. LG’nin `webOSMouse` ve `cursorStateChange` olaylarıyla uyumlu standart DOM etkileşimi kullanılır.

## Kumanda tuşları (1.3.0)

Ses açma/kısma tuşları uygulama tarafından ele geçirilmez; TV’nin yerleşik ses kontrolü çalışır. webOS ses servisi erişilebilir olduğunda oynatıcı içinden de `volumeUp` / `volumeDown` çağrısı yapılır. Kanal yukarı/aşağı, LG uygulamalarında gelen `PageUp` / `PageDown` tuşlarını dinler: canlı yayın oynatılıyorsa listedeki bir sonraki/önceki kanala geçer, içerik ekranında ise sayfayı kaydırır. Magic Remote tekerleği tarayıcının doğal scroll olayını kullanır.

Posterler TMDB, yazı tipleri Google Fonts üzerinden yüklenir ve internet gerektirir. Örnek kanal kartları canlı yayın bağlantısı içermez. LG mağaza gönderimi, lisanslı içerik, cihaz testleri ve paket imzalama ayrı yayın aşamalarıdır.

## Görsel katalog ve ikon (1.4.0)

Film/dizi kartları poster görseli kullanır. M3U içindeki `tvg-logo` veya `logo` alanı varsa canlı kanal kartı ve detay ekranı bu görseli kullanır; logo yoksa kartta NOVA’nın görsel kanal yüzeyi gösterilir. `public/icon.png`, webOS uygulama ikonudur; kaynak tasarım `public/nova-icon.svg` dosyasındadır.

LG kaynakları: https://webostv.developer.lge.com/develop/references/appinfo-json ve https://webostv.developer.lge.com/develop/guides/back-button

## Gerçek katalog ve izlemeye devam (1.5.0)

Liste içe aktarıldıktan sonra ana sayfanın kahraman alanı, canlı satırı, film/dizi kartları ve kategori seçimi yalnızca sağlayıcının içeriklerinden oluşturulur. “Kaldığın Yerden Devam Et” kartları oynatılan film veya dizi bölümünün `currentTime` / süre bilgisini cihazda saklar; uygulama yeniden açıldığında kartın doluluk oranı ve kalan süre gösterilir. Kart seçildiğinde yayın kaldığı saniyeden devam eder. İçerik %95'e ulaştığında geçmişten temizlenir. Büyük M3U listeleri ekranda ilk 300 kartla sınırlı gösterilir, kategori ve arama ile listenin tamamı taranabilir.

Portal bağlantısında liste önce içe aktarılır; hesap süresi sorgusu yayını engellemez. Sağlayıcı hesap API’si TV origin’ine CORS izni veriyorsa bitiş tarihi Ayarlar ekranında görünür, izin vermiyorsa liste yine kullanılabilir ve yalnızca bitiş tarihi gösterilemez.

HTTP bir liste adresi TV’de ağ veya origin hatası verirse aynı istek HTTPS’e yükseltilerek ikinci kez denenir.

Canlı kanal kartı seçildiğinde detay ekranı açılmadan oynatıcı doğrudan tam ekrana geçer. Kanal yukarı/aşağı tuşlarıyla değiştirildiğinde de tam ekran korunur.

URL’si olan film ve dizi bölümleri de karttan veya “Kaldığın Yerden Devam Et” bölümünden seçildiğinde doğrudan tam ekran oynatılır.

Canlı yayın sırasında kanal yukarı/aşağı tuşları mevcut video elementinin kaynağını değiştirir; oynatıcı penceresi yeniden kurulmadığı için tam ekran kapanmaz.

## TV okunabilirliği ve oynatıcı menüsü (1.6.1)

TV boyutunda kategori seçimi, içerik türleri, kart yazıları ve Tümünü gör düğmeleri büyütüldü. M3U sınıflandırması Türkçe kategori adları ve movie/series/live yayın yollarını kullanır; kayıtlı katalog da açılışta yeniden sınıflandırılır. Tam ekran oynatıcıdaki Ses / Altyazı düğmesi gerçek ses ve altyazı parçalarını listeler. Native textTracks ve HLS subtitleTracks seçimi ile Kapalı seçeneği desteklenir. Geri önce dil panelini kapatır. Videoya gömülü yazılar ve cihazın parça olarak bildirmediği diller seçilemez.

## Geliştirme ve doğrulama

Node.js 22.12+ ve npm gereklidir. `npm ci` ile bağımlılıkları kurun. Testler Microsoft Edge kullanır (`npx playwright install msedge`). Önce ayrı terminalde `npm run dev` başlatın, ardından `npm test` ve `npm run test:series` çalıştırın. `npm run build:webos` sonrasında `npm run test:audio` ile diskten açılış ve ses adaptörlerini doğrulayın. IPK üretmek için LG webOS CLI ayrıca gereklidir.

Kaynak kodda yayın hesabı veya cihaz anahtarı bulunmamalıdır. Hesap bilgilerini yalnızca uygulamanın Ayarlar ekranına girin; ekran görüntüleri, M3U listeleri ve derleme çıktıları Git dışında tutulur. Depo özel olarak oluşturulmuştur.
