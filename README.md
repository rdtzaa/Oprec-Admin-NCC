# 📊 Laporan Penugasan Pertemuan 3
## Monitoring System dengan Prometheus & Grafana
**Nama:** Raditya Zhafran Pranuja  
**NRP:** 5025241120

---

## 📋 Daftar Isi
1. [Deskripsi Arsitektur Sistem](#1-deskripsi-arsitektur-sistem)
2. [Komponen yang Digunakan](#2-komponen-yang-digunakan)
3. [Konfigurasi Prometheus](#3-konfigurasi-prometheus)
4. [Integrasi Prometheus dengan Grafana](#4-integrasi-prometheus-dengan-grafana)
5. [Custom Dashboard Grafana](#5-custom-dashboard-grafana)
6. [Sistem Alerting](#6-sistem-alerting)
7. [Query PromQL Kompleks](#7-query-promql-kompleks)
8. [Alur Monitoring](#8-alur-monitoring)
9. [Simulasi Anomali](#9-simulasi-anomali)
10. [Kendala yang Dihadapi](#10-kendala-yang-dihadapi)

---

## 1. Deskripsi Arsitektur Sistem

Sistem monitoring dibangun menggunakan dua EC2 instance di AWS dengan arsitektur berikut:

```
┌─────────────────┐         ┌──────────────────────┐
│   EC2 Grafana   │◄────────│   EC2 Prometheus      │
│                 │  query  │                        │
│ - Grafana :3000 │         │ - Prometheus   :9090   │
│ - Node Exp:9100 │         │ - Node Exp     :9100   │
│                 │         │ - Alertmanager :9093   │
└─────────────────┘         └──────────────────────┘
                                       │
                                       │ scrape metrics
                                       ▼
                             ┌──────────────────┐
                             │  Node Exporter   │
                             │ (kedua instance) │
                             └──────────────────┘
                                       │
                                       │ alert
                                       ▼
                             ┌──────────────────┐
                             │  Discord Webhook  │
                             └──────────────────┘
```

### Infrastruktur

| Instance | Fungsi | Port yang Digunakan |
|----------|--------|---------------------|
| EC2 Grafana | Visualisasi dashboard | 3000 (Grafana), 9100 (Node Exporter) |
| EC2 Prometheus | Metrics collection & alerting | 9090 (Prometheus), 9100 (Node Exporter), 9093 (Alertmanager) |

---

## 2. Komponen yang Digunakan

| Komponen | Versi | Fungsi |
|----------|-------|--------|
| Prometheus | v2.52.0 | Mengumpulkan dan menyimpan metrics |
| Node Exporter | v1.8.1 | Mengekspos metrics sistem |
| Grafana | Latest stable | Visualisasi data dan dashboard |
| Alertmanager | v0.27.0 | Mengelola dan mengirimkan notifikasi alert |
| Discord Webhook | - | Penerima notifikasi alert |

---

## 3. Konfigurasi Prometheus

### prometheus.yml

```yaml
# my global config
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
  # scrape_timeout is set to the global default (10s).

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ["localhost:9093"]
          # - alertmanager:9093

# Load rules once and periodically evaluate them according to the global 'evaluation_interval'.
rule_files:
  - "/etc/prometheus/rules/*.yml"
  # - "first_rules.yml"
  # - "second_rules.yml"

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
  # The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
  - job_name: "prometheus"

    # metrics_path defaults to '/metrics'
    # scheme defaults to 'http'.

    static_configs:
      - targets: ["localhost:9090"]
  - job_name: "node"
    static_configs:
      - targets: ["localhost:9100", "172.31.35.21:9100"]
```

**Penjelasan konfigurasi:**
- `scrape_interval: 15s` → Prometheus mengambil metrics setiap 15 detik
- `evaluation_interval: 15s` → Alert rules dievaluasi setiap 15 detik
- `rule_files` → Menunjuk ke file alert rules
- `alerting` → Menghubungkan Prometheus ke Alertmanager di port 9093
- `scrape_configs` → Mendefinisikan target yang di-scrape

### Alert Rules (alert_rules.yml)

File rules berisi 12 alert yang dikelompokkan dalam grup `ncc_server_alerts`:

| Alert | Kondisi | Severity | For |
|-------|---------|----------|-----|
| NodeDown | `up == 0` | critical | 1m |
| HighCPUUsage | CPU > 80% | warning | 30s |
| CriticalCPUUsage | CPU > 95% | critical | 30s |
| HighLoadAverage | Load > 80% core | warning | 30s |
| HighMemoryUsage | RAM > 80% | warning | 30s |
| CriticalMemoryUsage | RAM > 95% | critical | 30s |
| HighSwapUsage | Swap > 70% | warning | 30s |
| HighDiskUsage | Disk > 75% | warning | 30s |
| CriticalDiskUsage | Disk > 90% | critical | 30s |
| DiskWillFillIn24Hours | predict_linear < 0 | warning | 30s |
| HighNetworkReceive | RX > 100Mbps | warning | 30s |
| NetworkErrors | Errors > 10/s | warning | 30s |

---

## 4. Integrasi Prometheus dengan Grafana

### Langkah Konfigurasi Data Source

1. Login ke Grafana → **Connections** → **Data Sources**
2. Klik **"Add new data source"** → pilih **Prometheus**
3. Isi URL: `http://172.31.18.245:9090`
4. Klik **"Save & Test"** → status harus **"Successfully queried the Prometheus API"**

---

## 5. Custom Dashboard Grafana

Dashboard dibuat secara manual/custom tanpa menggunakan template Grafana. Dashboard terdiri dari 5 section utama:

### Section 1 — Overview
Menampilkan status keseluruhan sistem secara umum:
- Status Prometheus (UP/DOWN)
- Status Node Exporter per instance (UP/DOWN)
- System Uptime
- Jumlah CPU Cores
- Total RAM

### Section 2 — CPU Metrics
- **CPU Usage %** → Gauge dengan threshold hijau/kuning/merah
- **CPU Usage Over Time by Mode** → Time series
- **System Load Average** → Grafik 1m, 5m, 15m
- **Context Switches & Interrupts per Second**

### Section 3 — Memory Metrics
- **Memory Usage %** → Gauge
- **Memory Breakdown** → Stacked area chart
- **Swap Usage**
- **Open File Descriptors**

### Section 4 — Disk Metrics
- **Disk Usage %** → Gauge untuk mount point root `/`
- **Filesystem Usage Table** → Tabel lengkap semua filesystem
- **Disk I/O Read & Write** → Rate dalam bytes/sec
- **Disk I/O Latency** → Read & Write latency

### Section 5 — Network Metrics
- **Network Traffic** → RX/TX
- **Network Packets & Errors** → Packets per second dan error rate

Dashboard juga memiliki **variable dropdown "Instance"** untuk filter tampilan per server.

---

## 6. Sistem Alerting

### Arsitektur Alerting

```
Prometheus (rules)
       │
       │ alert firing
       ▼
Alertmanager (routing & grouping)
       │
       │ webhook
       ▼
Discord (notifikasi)
```

### Konfigurasi Alertmanager

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'instance', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'discord-ncc'

  routes:
    - matchers:
        - severity = "critical"
      receiver: 'discord-ncc'
      group_wait: 10s
      repeat_interval: 1h

receivers:
  - name: 'discord-ncc'
    discord_configs:
      - webhook_url: 'https://discord.com/api/webhooks/1502825360272785428/u50uEUZZcJ6TIY1txnCcQl0K2jHJ7fBncYLXv7RlwD3sZm8su7I_tQZeSgzIdFVV7EME'
        send_resolved: true
```

### Inhibit Rules
Dikonfigurasi agar tidak terjadi notifikasi ganda (spam):
- Jika `NodeDown` → suppress semua alert dari instance tersebut
- Jika `CriticalCPUUsage` firing → suppress `HighCPUUsage`
- Jika `CriticalMemoryUsage` firing → suppress `HighMemoryUsage`
- Jika `CriticalDiskUsage` firing → suppress `HighDiskUsage`

---

## 7. Query PromQL Kompleks


### rate() — Menghitung laju perubahan
```promql
# Network traffic dalam bits per second
rate(node_network_receive_bytes_total{device!~"lo|veth.*"}[5m]) * 8

# Disk I/O read speed
rate(node_disk_read_bytes_total{device!~"loop.*"}[5m])

# CPU usage dari rate idle
rate(node_cpu_seconds_total{mode="idle"}[5m])
```

### avg() — Agregasi rata-rata
```promql
# CPU usage rata-rata per instance
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU breakdown per mode
avg by(mode) (rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100
```

### predict_linear() — Prediksi nilai masa depan
```promql
# Prediksi apakah disk akan penuh dalam 24 jam
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[6h], 24 * 3600) < 0
```

### count() — Menghitung jumlah elemen
```promql
# Menghitung jumlah CPU cores
count without(cpu, mode) (node_cpu_seconds_total{mode="idle"})
```

### Arithmetic kompleks — Kalkulasi multi-metrik
```promql
# Memory breakdown: hitung RAM yang benar-benar digunakan
node_memory_MemTotal_bytes 
  - node_memory_MemFree_bytes 
  - node_memory_Buffers_bytes 
  - node_memory_Cached_bytes

# Disk I/O latency dalam milliseconds
rate(node_disk_read_time_seconds_total[5m]) 
  / rate(node_disk_reads_completed_total[5m]) * 1000
```

---

## 8. Alur Monitoring

Berikut alur lengkap dari pengumpulan metrics hingga notifikasi:

```
1. NODE EXPORTER
   Berjalan di setiap server pada port 9100
   Mengekspos metrics sistem: CPU, RAM, Disk, Network
   Endpoint: http://<ip_vm>:9100/metrics
         │
         │ HTTP scrape setiap 15 detik
         ▼
2. PROMETHEUS
   Scrape metrics dari semua target
   Menyimpan dalam time-series database
   Mengevaluasi alert rules setiap 15 detik
         │
         │ Query PromQL
         ├─────────────────────────────────►  GRAFANA
         │                                    Menampilkan dashboard
         │                                    visualisasi real-time
         │ alert firing
         ▼
3. ALERTMANAGER
   Menerima alert dari Prometheus
   Melakukan grouping, routing, deduplication
   Menerapkan inhibit rules
         │
         │ HTTP POST webhook
         ▼
4. DISCORD
   Menerima notifikasi alert
   Menampilkan informasi: nama alert, instance,
   severity, deskripsi, dan status (firing/resolved)
```

---

## 9. Simulasi

Untuk membuktikan sistem monitoring berfungsi, dilakukan simulasi stress test:

### Stress CPU
```bash
stress --cpu 2 --timeout 180
```

### Stress Memory
```bash
stress --vm 1 --vm-bytes 200M --timeout 180
```

**Hasil yang diamati:**
1. Di Grafana dashboard → panel CPU/Memory gauge naik signifikan
2. Di Prometheus `/alerts` → status berubah `Inactive → Pending → Firing`
3. Di Discord → notifikasi alert masuk dengan informasi instance dan severity

---

## 10. Kendala yang Dihadapi

| Kendala | Solusi |
|---------|--------|
| Alert stuck di Pending, tidak berubah ke Firing | Durasi stress test kurang dari nilai `for:` di alert rules. Solusi: perpanjang timeout stress test atau ubah `for:` ke 30s |
| Webhook Discord tidak menerima notifikasi dari Alertmanager | `webhook_configs` mengirim format JSON standar yang tidak support dengan Discord. Solusi: ganti ke `discord_configs` yang merupakan receiver untuk Discord |
| stress --vm gagal dengan signal 9 | RAM EC2 terlalu kecil untuk alokasi. Solusi: kurangi `--vm-bytes` ke nilai yang lebih kecil |
| Alertmanager tidak terhubung ke Prometheus | Bagian `alerting` di `prometheus.yml` belum dikonfigurasi. Solusi: tambahkan konfigurasi alertmanager dan restart Prometheus |

---
