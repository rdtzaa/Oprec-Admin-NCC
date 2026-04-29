# Laporan Penugasan CI/CD — Pertemuan 2

**Nama:** Raditya Zhafran Pranuja  
**NRP:** 5025241120  
**Repository:** [https://github.com/rdtzaa/taks-manager-jenkins](https://github.com/rdtzaa/taks-manager-jenkins)

---

## Daftar Isi

1. [Deskripsi Pipeline](#1-deskripsi-pipeline)
2. [Penjelasan Integrasi Jenkins dengan SonarQube](#2-penjelasan-integrasi-jenkins-dengan-sonarqube)
3. [Konfigurasi Jenkins dan SonarQube](#3-konfigurasi-jenkins-dan-sonarqube)
4. [Hasil Analisis Kode di SonarQube](#4-hasil-analisis-kode-di-sonarqube)
5. [Alur Pipeline](#5-alur-pipeline)
6. [Fitur Opsional yang Diimplementasikan](#6-fitur-opsional-yang-diimplementasikan)
7. [Kendala yang Dihadapi](#7-kendala-yang-dihadapi)

---

## 1. Deskripsi Pipeline

### Project: Task Manager

Project yang digunakan adalah aplikasi web manajemen tugas berbasis **Node.js + Express**. Aplikasi ini memiliki fitur:

- REST API CRUD untuk manajemen task (Create, Read, Update, Delete)
- Tampilan web dengan dark theme menggunakan HTML, CSS, dan JavaScript vanilla
- Filter task berdasarkan status dan prioritas
- Statistik task secara real-time
- 22 unit test dengan coverage **91%** menggunakan Jest dan Supertest

### Struktur Project

```
taks-manager-jenkins/
├── src/
│   ├── app.js                  
│   ├── routes/
│   │   └── tasks.js            # API routes
│   ├── controllers/
│   │   └── taskController.js   
│   ├── models/
│   │   └── taskModel.js        
│   └── public/
│       └── index.html          # web
├── tests/
│   └── tasks.test.js           # unit test
├── Jenkinsfile                 
├── sonar-project.properties    
├── package.json
└── package-lock.json
```

### Pipeline yang Dibuat

Pipeline menggunakan **Jenkinsfile** dengan 5 stage:

| Stage | Deskripsi |
|-------|-----------|
| **Install** | Install semua dependencies dengan `npm ci` |
| **Test** | Menjalankan 22 unit test + generate laporan coverage |
| **SonarQube Analysis** | Analisis kualitas kode menggunakan sonar-scanner |
| **Quality Gate** | Menunggu hasil evaluasi Quality Gate dari SonarQube |
| **Build** | Parallel stage: Lint Check + Dependency Audit |

```groovy
pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    environment {
        NODE_ENV = 'test'
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Test') {
            steps {
                sh 'npm run test:ci'
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh 'npx sonar-scanner'
                }
            }
        }
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('Build') {
            parallel {
                stage('Lint Check') {
                    steps {
                        sh 'node --check src/app.js'
                    }
                }
                stage('Dependency Audit') {
                    steps {
                        sh 'npm audit --audit-level=high || true'
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline: ${currentBuild.result ?: 'SUCCESS'}"
            cleanWs()
        }
        success {
            echo "✅ Build #${env.BUILD_NUMBER} succeeded"
        }
        failure {
            echo "❌ Build #${env.BUILD_NUMBER} failed"
        }
    }
}
```

---

## 2. Penjelasan Integrasi Jenkins dengan SonarQube

### Cara Kerja Integrasi

Jenkins dan SonarQube diintegrasikan melalui dua komponen:

**1. Plugin SonarQube Scanner di Jenkins**  
Plugin ini memungkinkan Jenkins untuk menjalankan analisis kode SonarQube langsung dari dalam pipeline menggunakan blok `withSonarQubeEnv()`. Plugin secara otomatis menyuntikkan environment variable seperti `SONAR_HOST_URL` dan `SONAR_AUTH_TOKEN` ke dalam proses build.

**2. Webhook SonarQube → Jenkins**  
Setelah analisis selesai, SonarQube mengirimkan notifikasi ke Jenkins melalui webhook (`http://jenkins-blueocean:8080/sonarqube-webhook/`). Notifikasi ini berisi hasil evaluasi Quality Gate yaitu apakah kode lulus atau gagal standar kualitas. Jenkins menunggu notifikasi ini di stage `waitForQualityGate`.

### Alur Integrasi

```
Jenkins                          SonarQube
   |                                 |
   |-- npx sonar-scanner ----------->|  (kirim kode untuk dianalisis)
   |                                 |
   |<-- webhook: Quality Gate result-|  (kirim hasil evaluasi)
   |                                 |
   |-- (PASSED) lanjut ke Build ---->|
   |-- (FAILED) pipeline berhenti --|
```

### Konfigurasi yang Diperlukan

| Komponen | Konfigurasi |
|----------|-------------|
| Jenkins Credentials | `sonarqube-token` : Secret text berisi token dari SonarQube |
| Jenkins Configure System | SonarQube server name: `sonarserver`, URL: `http://sonarqube:9000` |
| Jenkins Tools | SonarQube Scanner: `sonarqube8.0` (v8.0.1.6346) |
| SonarQube Webhook | URL: `http://jenkins-blueocean:8080/sonarqube-webhook/` |
| sonar-project.properties | Project key, sources, test paths, coverage report path |

---

## 3. Konfigurasi Jenkins dan SonarQube

### 3.1 SonarQube Scanner Installation

Konfigurasi SonarQube Scanner di **Manage Jenkins → Tools → SonarQube Scanner installations**:

- **Name:** `sonarqube8.0`
- **Version:** SonarQube Scanner 8.0.1.6346

<img width="2541" height="1026" alt="image" src="https://github.com/user-attachments/assets/7a625cce-8e48-426a-9037-35be84f39abb" />


### 3.2 Jenkins Credentials

Credentials yang disimpan di **Manage Jenkins → Credentials**:

| ID | Keterangan |
|----|-----------|
| `sonarqube-token` | Token untuk SonarQube |
| `github-token` | Token akses GitHub |

<img width="2574" height="953" alt="image" src="https://github.com/user-attachments/assets/bd2c4061-e6b2-4af9-8503-7e66ce7facf3" />

### 3.3 Webhook GitHub → Jenkins

Konfigurasi webhook di **GitHub Repository → Settings → Webhooks**:

- **Webhook Github URL:** `http://20.239.105.63:8080/github-webhook/`
- **Content type:** `application/x-www-form-urlencoded`
- **Trigger:** Just the push event
- **Active:** ✅

<img width="1953" height="1535" alt="image" src="https://github.com/user-attachments/assets/17597eac-1206-48c9-9b69-aec28b77129c" />

### 3.4 Webhook SonarQube → Jenkins

Konfigurasi webhook di **SonarQube → Administration → Webhooks**:

- **URL:** `http://jenkins-blueocean:8080/sonarqube-webhook/`

Menggunakan nama container Docker bernama `jenkins-blueocean` karena SonarQube dan Jenkins berada dalam Docker network yang sama yaitu `jenkins` sehingga komunikasi antar container bisa dilakukan tanpa IP publik.

---

## 4. Hasil Analisis Kode di SonarQube

### Overview Dashboard

<img width="2996" height="1410" alt="image" src="https://github.com/user-attachments/assets/d03b395e-a4b1-4af0-b7a5-c41625e2985c" />

### Ringkasan Hasil

| Metrik | Hasil | Rating |
|--------|-------|--------|
| **Quality Gate** | ✅ Passed | — |
| **Security** | 0 Open Issues | A |
| **Reliability** | 0 Bugs | A |
| **Maintainability** | 5 Code Smells | A |
| **Coverage** | 90.3% | — |
| **Duplications** | 0.0% | — |
| **Security Hotspot** | 1 (needs review) | E |
| **Lines of Code** | 179 | — |

### Analisis Detail

**Security (A):** Tidak ditemukan celah keamanan pada kode. Semua endpoint API telah divalidasi input-nya.

**Reliability (A):** Tidak ada bug yang terdeteksi. Semua fungsi berjalan sesuai dengan 22 unit test yang dijalankan.

**Maintainability (A):** Terdapat 5 code smell yang terdeteksi. Tetap mendapat rating A karena tidak mempengaruhi fungsionalitas dari service ini.

**Coverage 90.3%:** Dari 110 baris kode yang perlu dicakup, 90.3% sudah tercakup oleh unit test.

**Security Hotspot (1):** Terdapat 1 security hotspot yang perlu direview secara manual. Kode yang berpotensi perlu perhatian lebih dari sisi keamanan.

---

## 5. Alur Pipeline

### Visualisasi di Blue Ocean

<img width="3002" height="1466" alt="image" src="https://github.com/user-attachments/assets/ea97c959-d47d-4df4-93ef-20e96c630766" />

### Penjelasan

```
Push Code ke GitHub
        │
        ▼
[GitHub Webhook] ──────────────────────────────────────►
        │                                               Jenkins
        ▼                                                 │
[Declarative: Checkout SCM]                               │
Jenkins otomatis clone repo dari GitHub                   │
        │                                                 │
        ▼                                                 │
[Stage: Install]                                          │
npm ci — install semua dependencies dari package-lock     │
        │                                                 │
        ▼                                                 │
[Stage: Test]                                             │
Jest menjalankan 22 unit test                             │
Generate laporan coverage (lcov)                          │
        │                                                 │
        ▼                                                 │
[Stage: SonarQube Analysis]                               │
sonar-scanner mengirim kode ke SonarQube                  │
        │                                                 │
        ▼                                          SonarQube
[Stage: Quality Gate]                                     │
Jenkins menunggu hasil dari SonarQube ◄── webhook ────────┘
  PASSED → lanjut ke Build
  FAILED → pipeline berhenti
        │
        ▼
[Stage: Build (Parallel)]
  ┌─────────────────┐  ┌──────────────────┐
  │  Lint Check     │  │ Dependency Audit │
  │ node --check    │  │ npm audit        │
  └─────────────────┘  └──────────────────┘
        │
        ▼
[Post: always]
cleanWs() — bersihkan workspace
        │
        ▼
✅ Pipeline Selesai
```

### Hasil Build

| Build | Trigger | Status | Durasi |
|-------|---------|--------|--------|
| #12 | Manual (user Raditya) | ✅ Success | 41 detik |
| #13 | GitHub push by rdtzaa | ✅ Success | 32 detik |

Build #13 menunjukkan bahwa webhook GitHub berfungsi dimana pipeline otomatis berjalan saat ada push ke repository tanpa perlu klik Build Now di Jenkins secara manual.

<img width="2996" height="1047" alt="image" src="https://github.com/user-attachments/assets/98633c80-c7f9-48cd-af9a-e02f86d84f56" />

---

## 6. Kendala yang Dihadapi

| No | Kendala | Solusi |
|----|---------|--------|
| 1 | `npm: not found` — Node.js tidak tersedia di Jenkins container | Install plugin **NodeJS** di Jenkins, konfigurasi di Tools lalu tambahkan di Jenkinsfile |
| 2 | `Invalid tool type "nodejs"` — Plugin NodeJS belum aktif | Restart Jenkins setelah install plugin |
| 3 | `npm ci` gagal karena tidak ada `package-lock.json` | Jalankan `npm install` di lokal untuk generate `package-lock.json`, lalu push ke GitHub |
| 4 | `SonarQube installation does not match` | Pastikan nama SonarQube server di Configure System sama persis dengan yang ada di Jenkinsfile (`'SonarQube'`) |

---
