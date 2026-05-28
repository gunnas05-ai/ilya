# 🚀 KAPTAN Platformu — Production Launch Checklist

**Hazırlanma Tarihi:** 2026-05-23
**Hedef Launch:** 2 hafta içinde

---

## FAZ 1: Altyapı Hazırlığı (Gün -14)

- [ ] **Domain ve SSL**
  - [ ] `kaptanlojistik.com` ve `*.kaptanlojistik.com` wildcard SSL (Let's Encrypt)
  - [ ] `api.kaptanlojistik.com` → APISIX Gateway (9080)
  - [ ] `admin.kaptanlojistik.com` → Next.js Admin Panel (3005)

- [ ] **Kubernetes Cluster**
  - [ ] Production namespace: `kaptan-production`
  - [ ] Staging namespace: `kaptan-staging`
  - [ ] StorageClass: SSD (production), HDD (staging)
  - [ ] kubectl context doğrulaması

- [ ] **HashiCorp Vault**
  - [ ] Production secret'leri: JWT_SECRET, DB_PASS, IYZICO_API_KEY, IYZICO_SECRET_KEY
  - [ ] ENCRYPTION_KEY (AES-256, 32 byte)
  - [ ] TX_SIGNING_SECRET (HMAC-SHA256)
  - [ ] Vault policy: sadece `kaptan-backend` service account okuyabilir

- [ ] **Container Registry**
  - [ ] `registry.kaptanlojistik.com/kaptan-backend:stable`
  - [ ] Image signing (Cosign)

---

## FAZ 2: Veritabanı ve Veri (Gün -10)

- [ ] **PostgreSQL Production**
  - [ ] 500GB SSD, 32GB RAM
  - [ ] `max_connections: 200`
  - [ ] Otomatik backup: her gece 02:00 → S3 (30 gün retention)
  - [ ] PostGIS extension kontrolü: `CREATE EXTENSION IF NOT EXISTS postgis;`
  - [ ] Migration'ları çalıştır: `npm run migration:run`

- [ ] **Redis Production**
  - [ ] 3 replica (sentinel)
  - [ ] `maxmemory 4gb`, `maxmemory-policy allkeys-lru`
  - [ ] Persistence: AOF + RDB

- [ ] **Kafka Production**
  - [ ] 3 broker, replication factor 3
  - [ ] Topic'leri oluştur (11 topic)
  - [ ] Retention: 7 gün (prod), 1 gün (staging)

---

## FAZ 3: Ödeme Altyapısı (Gün -7)

- [ ] **İyzico Production Hesabı**
  - [ ] API Key + Secret Key (production)
  - [ ] Webhook URL: `https://api.kaptanlojistik.com/api/v1/escrow/gateway/webhook/iyzico`
  - [ ] Test kartları ile canlı test

- [ ] **PCI-DSS Kontrol Listesi**
  - [ ] Kart numarası platformda SAKLANMIYOR (doğrulandı)
  - [ ] Tüm kart verisi TLS 1.3 ile iletilir
  - [ ] Kart token'ları AES-256 ile şifreli
  - [ ] Şifreleme anahtarı Vault'ta
  - [ ] PCI-DSS SAQ-D self-assessment
  - [ ] Production'da İyzico Checkout Form (WebView) kullan

- [ ] **Ödeme Testleri**
  - [ ] Kart kaydetme → başarılı
  - [ ] Kart kaydetme → geçersiz kart → hata
  - [ ] Ödeme → başarılı
  - [ ] Ödeme → yetersiz bakiye → hata
  - [ ] İade → başarılı
  - [ ] Idempotency → aynı işlem 2 kez gönderilmez

---

## FAZ 4: Abonelik ve Komisyon (Gün -5)

- [ ] **Abonelik Paketlerini Seed Et**
  - [ ] STARTER (199 TL/ay, 10 yük, 2 kullanıcı)
  - [ ] PROFESSIONAL (499 TL/ay, 100 yük, 5 kullanıcı, Webhook)
  - [ ] ENTERPRISE (1999 TL/ay, limitsiz, API, SLA)

- [ ] **Kontör Paketlerini Seed Et**
  - [ ] 50 kontör (99 TL)
  - [ ] 150 kontör (249 TL)
  - [ ] 500 kontör (599 TL)

- [ ] **Komisyon Oranlarını Seed Et**
  - [ ] platform_match: %2.0
  - [ ] own_carrier: %0.5
  - [ ] escrow_acceleration: %1.0
  - [ ] insurance: %15.0
  - [ ] fuel_card: %0.5
  - [ ] early_payment: %1.0

- [ ] **Abonelik Testleri**
  - [ ] Paket satın alma → başarılı ödeme
  - [ ] Paket satın alma → başarısız kart → hata
  - [ ] Otomatik yenileme → cron çalışıyor
  - [ ] 3 başarısız deneme → grace_period

---

## FAZ 5: Güvenlik ve Performans (Gün -3)

- [ ] **Güvenlik Taraması**
  - [ ] `npm audit` → tüm kritik güvenlik açıkları kapatıldı
  - [ ] Docker imajları Trivy ile tarandı (CI'da otomatik)
  - [ ] API rate limiting: 300 req/dk/IP, 1000 req/saat/API key
  - [ ] Helmet.js aktif (production)
  - [ ] CORS: sadece bilinen domain'lere izin ver (production)

- [ ] **Yük Testi (k6 veya Artillery)**
  - [ ] 100 eşzamanlı kullanıcı → 200ms p95 latency
  - [ ] 1000 eşzamanlı ödeme → hata oranı <%1
  - [ ] WebSocket: 5000 bağlantı → stabil

- [ ] **Monitoring**
  - [ ] Prometheus metrikleri → Grafana dashboard
  - [ ] Kafka consumer lag → alarm (lag > 1000)
  - [ ] API hata oranı → alarm (> %1)
  - [ ] Ödeme başarısızlık oranı → alarm (> %5)
  - [ ] Sentry hata takibi aktif

- [ ] **Log Aggregation**
  - [ ] Elasticsearch + Kibana (veya harici)
  - [ ] Tüm servisler JSON formatında log
  - [ ] PCI-DSS: kart verisi log'lanmaz

---

## FAZ 6: Launch (Gün 0)

- [ ] **Deploy**
  ```bash
  helm upgrade --install kaptan-production ./k8s \
    --namespace kaptan-production \
    --values ./k8s/values-prod.yaml \
    --set imageTag=stable \
    --wait --timeout 15m
  ```

- [ ] **Health Check**
  ```bash
  curl https://api.kaptanlojistik.com/api/v1/health
  # → {"status":"HEALTHY","services":{"database":"healthy","redis":"healthy","websocket":"healthy"}}
  ```

- [ ] **Smoke Test**
  - [ ] Login → 200 OK, JWT token dönüyor
  - [ ] Yük oluşturma → abonelik kontrolü çalışıyor
  - [ ] Yük listeleme → PostgreSQL çalışıyor
  - [ ] WebSocket bağlantısı → canlı takip çalışıyor
  - [ ] Ödeme → İyzico production API çalışıyor

- [ ] **DNS Propagation**
  - [ ] `api.kaptanlojistik.com` → IP
  - [ ] `admin.kaptanlojistik.com` → IP
  - [ ] SSL sertifikası geçerli (tüm tarayıcılar)

- [ ] **Geri Alma Planı (Rollback)**
  ```bash
  helm rollback kaptan-production --namespace kaptan-production
  ```

---

## FAZ 7: Launch Sonrası (Gün +1..+7)

- [ ] İlk 24 saat: sürekli monitoring
- [ ] İlk hafta: günlük performans raporu
- [ ] Kullanıcı geri bildirim kanalı (Slack/Email)
- [ ] Acil durum kontağı: 05326741416
- [ ] Backup doğrulama: S3'ten geri yükleme testi

---

## İletişim ve Acil Durum

| Rol | İsim | Telefon |
|---|---|---|
| Operasyon | İlyas Duran | 05326741416 |
| Teknik Destek | 7/24 | 0850 KAPTAN |
| Acil Durum | Slack `#kaptan-alerts` | — |

---

*Bu checklist tamamlandığında KAPTAN Platformu production'a hazırdır.*
