# OPREC Admin NCC Modul 1 — Docker

- **Nama:** Raditya Zhafran Pranuja
- **NRP:** 5025241120

Assignment ini berisi service sederhana untuk *health check* dan dokumentasi lengkap proses containerization + deployment VPS.

## Deskripsi Soal

Target yang dikerjakan pada modul ini:

1. Membuat service dengan endpoint `/health` untuk *health check* (response sukses `200 OK`).
2. Menjalankan service menggunakan Docker.
3. Melakukan deployment Virtual Machine di VPS.
4. Memastikan endpoint `/health` dapat diakses secara publik.
5. Optimasi konfigurasi Docker (Alpine base image, `HEALTHCHECK`, docker-compose, environment variable, `.dockerignore`, restart policy, dan port configuration).
6. Mendokumentasikan pengerjaan dalam laporan (README).

| Tech | Kegunaan |
| --- | --- |
| Node.js + Express | Membuat API server sederhana |
| Docker | Containerization service |
| Docker Compose | Orkestrasi container (build + run) |
| VPS (Azure/DigitalOcean/dll.) | Host publik untuk deployment |

## Daftar Isi

- [Deskripsi Singkat Service](#deskripsi-singkat-service)
- [Endpoint `/health`](#endpoint-health)
- [Bukti Endpoint Dapat Diakses](#bukti-endpoint-dapat-diakses)
- [Menjalankan Service (Tanpa Docker)](#menjalankan-service-tanpa-docker)
- [Containerization Dengan Docker](#containerization-dengan-docker)
- [Menjalankan Dengan Docker Compose](#menjalankan-dengan-docker-compose)
- [Deployment ke VPS](#deployment-ke-vps)
- [Kendala Yang Dihadapi](#kendala-yang-dihadapi)

---

## Deskripsi Singkat Service

Service ini adalah API sederhana berbasis **Node.js + Express** yang menyediakan endpoint `GET /health` untuk mengecek status service.

Fitur utama output `GET /health`:

- Status `200 OK`
- Uptime service
- Waktu server (UTC/ISO)
- Informasi penggunaan memori proses
- Informasi OS (platform, release, arsitektur)

Lokasi implementasi:

- Source: `ncc-health-service/app.js`
- Dockerfile: `ncc-health-service/Dockerfile`
- Compose: `ncc-health-service/docker-compose.yml`

---

## Endpoint `/health`

### Spesifikasi

- **Method**: `GET`
- **Path**: `/health`
- **Success Response**: `200 OK`
- **Content-Type**: `application/json`

### Contoh Response

```json
{
  "status": "success",
  "message": "200 OK - System is running smoothly",
  "data": {
    "service_uptime": "0h 0m 2s",
    "server_time": "2026-04-14T16:18:56.307Z",
    "memory_usage": "55 MB",
    "os_platform": "Linux 6.12.76-linuxkit (x64)"
  }
}
```

Catatan:

- `server_time`, `service_uptime`, dan `memory_usage` bersifat dinamis.
- Port default aplikasi adalah `8080` (bisa diubah lewat environment variable `PORT`).

---

## Bukti Endpoint Dapat Diakses

Bagian ini berisi bukti berupa output real dari pengujian dengan Docker Compose di environment lokal.

<img width="3071" height="997" alt="image" src="https://github.com/user-attachments/assets/69846632-b115-4c0e-846b-ed9f44434429" />


### 1) Jalankan container dengan Docker Compose

```bash
cd ncc-health-service
docker compose up -d --build
```

### 2) Akses endpoint `/health`

Compose memetakan port host `3030` ke container `8080`, jadi endpoint bisa diakses di:

```bash
curl -sS http://localhost:3030/health
```

Contoh output (diambil saat testing):

```json
{
    "status": "success",
    "message": "200 OK - System is running smoothly",
    "data": {
        "service_uptime": "0h 0m 2s",
        "server_time": "2026-04-14T16:18:56.307Z",
        "memory_usage": "55 MB",
        "os_platform": "Linux 6.12.76-linuxkit (x64)"
    }
}
```

### 3) Bukti container dalam kondisi `healthy`

Dockerfile memiliki `HEALTHCHECK` yang melakukan request ke `http://localhost:8080/health` di dalam container.

```bash
docker ps --filter name=ncc-health-assignment
```

Contoh status (diambil saat testing):

```text
NAMES                   STATUS                    PORTS
ncc-health-assignment   Up 37 seconds (healthy)   0.0.0.0:3030->8080/tcp, [::]:3030->8080/tcp
```

Setelah selesai:

```bash
docker compose down
```

---

## Menjalankan Service (Tanpa Docker)

Prerequisite:

- Node.js dan npm terpasang

Langkah:

```bash
cd ncc-health-service
npm install
PORT=8080 npm start
```

Testing:

```bash
curl http://localhost:8080/health
```

---

## Containerization Dengan Docker

### Ringkasan Konfigurasi Docker

File: `ncc-health-service/Dockerfile`

- **Base image**: `node:20-alpine` (ringan)
- **Dependency install**: `npm install --only=production`
- **Expose**: `8080`
- **HEALTHCHECK**: melakukan request ke `/health` (menggunakan `wget`)

### Build Image

```bash
cd ncc-health-service
docker build -t ncc-health-service:latest .
```

### Run Container

Contoh menjalankan container manual (tanpa compose):

```bash
docker run --rm -p 3030:8080 -e PORT=8080 --name ncc-health-service ncc-health-service:latest
```

Lalu test:

```bash
curl http://localhost:3030/health
```

### `.dockerignore`

File: `ncc-health-service/.dockerignore`

`.dockerignore` dipakai untuk mengecualikan file yang tidak perlu masuk build context agar build lebih cepat dan image lebih kecil.

---

## Menjalankan Dengan Docker Compose

File: `ncc-health-service/docker-compose.yml`

Konfigurasi utama:

- `restart: unless-stopped`
- Port mapping: `3030:8080`
- Environment variable: `PORT=8080`

Command:

```bash
cd ncc-health-service
docker compose up -d --build
curl http://localhost:3030/health
docker compose down
```

---

## Deployment ke VPS

Di bawah ini adalah alur *end-to-end* deployment ke VPS (Ubuntu 22.04/24.04 sebagai contoh). Bagian IP/domain silakan disesuaikan.

### 1) Siapkan VPS dan buka port

- Buat VM di provider (Azure / DigitalOcean / dsb.)
- Pastikan inbound rule / firewall mengizinkan akses:
  - `80/tcp` (jika pakai Nginx reverse proxy)
  - dan/atau `3030/tcp` (jika expose port container langsung)

### 2) Install Docker Engine + Compose Plugin

Ikuti cara resmi Docker untuk Ubuntu, atau ringkasnya (contoh):

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
```

### 3) Deploy service dengan Docker Compose

Opsi paling sederhana: clone repository lalu build di VPS.

```bash
cd /opt
sudo git clone <URL_REPO_KAMU> oprec_ncc
cd oprec_ncc/ncc-health-service

sudo docker compose up -d --build
curl http://localhost:3030/health
```

### 4) (Opsional) Pasang Nginx reverse proxy (port 80)

Jika ingin endpoint publik cukup via port 80:

```bash
sudo apt update
sudo apt install -y nginx
```

Edit config Nginx (contoh: `/etc/nginx/sites-available/default`) agar meneruskan request ke service di port 3030:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Restart:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Testing dari luar VPS:

- Jika expose langsung (tanpa Nginx): `http://<IP-VPS>:3030/health`
- Jika pakai Nginx: `http://<IP-VPS>/health`

### 5) Push ke Docker Hub (di lokal)

```bash
docker login
```
Pertama kalian perlu login ke akun docker milik kalian.
```bash
docker build -t ncc-health-assignment .
docker tag ncc-health-assignment:latest radityazhaf/rdtzaa:ncc-health-assignment
docker push radityazhaf/rdtzaa:ncc-health-assignment
```
Sebelumnya kita telah melakukan build container lanjut kita akan memberikan tag dan melakukan push ke repository docker hub milik kalian. Setelah itu di VPS kita hanya perlu menyiapkan file `docker-compose.yml` yang sudah kita buat sebelumnya.

---

## Kendala Yang Dihadapi

Belum ada kendala khusus yang terdokumentasi. Jika mengalami kendala umum, berikut beberapa contoh dan solusinya:

- **Port bentrok** (`bind: address already in use`) → ganti host port di `docker-compose.yml` atau hentikan service lain.
- **Permission Docker** (`permission denied /var/run/docker.sock`) → jalankan dengan `sudo` atau tambahkan user ke group `docker`.
- **Firewall/NSG belum terbuka** → pastikan inbound rule mengizinkan port 80 dan/atau 3030.
});

