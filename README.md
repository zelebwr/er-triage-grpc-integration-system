---
date_created: 2026-04-03T21:36
date_modified: 2026-04-06T20:08
---

# gRPC-Based Real-Time ER Triage and Vitals Monitoring System

Jonathan Zelig Sutopo - 5027241047
Muhammad Ardiansyah Tri Wibowo - 5027241091

---

Judul dari penugasan ini adalah **Sistem Antrean Prioritas dan Pemantauan Vital IGD Real-Time Berbasis gRPC**

## A. Deskripsi dan Tujuan

Sistem terdistribusi ini mensimulasikan alur kerja di Instalasi Gawat Darurat (IGD). Sistem mengintegrasikan tiga titik akhir (klien) yang berbeda: Perawat yang mendaftarkan keluhan pasien, Sensor Medis yang membaca tanda-tanda vital secara berkelanjutan, dan Dashboard Dokter yang menampilkan urutan prioritas penanganan pasien berdasarkan tingkat keparahan yang dihitung secara real-time.

Tujuan dari implementasi adalah untuk mengimplementasikan protokol gRPC (Protocol Buffers atas HTTP/2) untuk mengatasi keterbatasan REST API dalam menangani aliran data medis (IoT) yang masif. Proyek ini mendemonstrasikan pertukaran pesan asinkron melalui streaming, pengelolaan state pasien di dalam memori server dan arsitektur microservices skala kecil.

---

## B. TL;DR Deskripsi dan Tujuan

### 1. Deskripsi

- Distributed system untuk mensimulasikan alur kerja di IGD
- Terdapat tiga node dalam IGD yang aktif:
  1.  Perawat mendaftarkan keluhan pasien
  2.  Sensor medis mentransmisikan tanda-tanda vital secara berkelanjutan
  3.  Dashboard Dokter menampilkan urutan prioritas penanganan pasien

### 2. Tujuan

- Implementasi gRPC untuk mengatasi keterbatasan REST API dalam menangani data IoT medis yang masif
- Demonstrasi pertukaran pesan async streaming,
- Demonstrasi pengelolaan state pasien dalam memori server
- Demonstrasi arsitektur microservices skala kecil

---

## C. Desain Sistem

- **Syarat #6: Minimal 3 Services**  
  Kita akan mendefinisikan 3 layanan di dalam file `.proto`, yaitu: `AdmissionService`, `VitalsService`, dan `DashboardService`.
- **Syarat #1: Request-Response (Unary) gRPC**
  - Ini diimplementasikan pada **AdmissionService**.
    - _Cara kerja:_ Klien Perawat mengirimkan data registrasi satu kali (Nama: John, Umur: 45, Keluhan: Nyeri Dada). Server memproses, menyimpan data di memori, dan membalas satu kali dengan ID Pasien (misal: `P-001`). Ini adalah metode _request-response_ klasik.
- **Syarat #2: Streaming gRPC (Bi-directional & Server-side)**
  - **VitalsService (Bi-directional Streaming):** Klien Mesin Monitor mengirimkan aliran data detak jantung (BPM) dan tekanan darah setiap 1 detik ke server secara terus-menerus. Di jalur yang sama, server mendengarkan. Jika server mendeteksi detak jantung turun di bawah batas kritis, server langsung menembakkan aliran respons (peringatan darurat) kembali ke mesin tersebut. Keduanya berbalasan di satu koneksi terbuka.
  - **DashboardService (Server-side Streaming):** Klien Dokter melakukan _request_ satu kali saat membuka aplikasi. Setelah itu, server akan terus-menerus memberikan _stream_ pembaruan (push) berupa daftar antrean pasien. Jika ada pasien yang tiba-tiba kritis, urutan antrean di layar dokter akan otomatis berubah dari server.
- **Syarat #4: State Management In-Memory Server**
  - Server gRPC Node.js milikmu tidak perlu database eksternal agar kamu bisa menyelesaikannya tepat waktu. Kamu cukup membuat variabel lokal (misalnya array atau `Map` di JavaScript) bernama `patientsState` dan `triageQueue`. Setiap kali Perawat menambahkan pasien atau Mesin mengirim data kritis, array di dalam RAM server ini akan diperbarui.
- **Syarat #5: Multi Client**
  - Kamu akan membuat satu _file_ Server (`server.js`), dan tiga _file_ Client secara terpisah: `client_perawat.js`, `client_sensor.js`, dan `client_dokter.js`. Ketiga klien ini akan berjalan di terminal yang berbeda secara bersamaan dan menembak _port_ server yang sama.
- **Syarat #3: Error Handling**
  - Ini diterapkan di sisi Server. Jika Perawat lupa mengisi nama, server menolak Unary _request_ dengan gRPC status code `INVALID_ARGUMENT`. Jika ID Pasien yang dikirim oleh Sensor tidak ada di memori server, server mengembalikan status `NOT_FOUND`.

---

## D. Detail Fitur

### 4. Detail Fitur Sistem (Untuk Presentasi)

1. **Fitur Pendaftaran Pasien (Admission Feature - Unary)** - **Logika:** Perawat menginput data demografi dan keluhan pasien. Data dikirim ke server. Server langsung menyimpan data tersebut ke dalam memori (_array/state_ in-memory) dan membalas dengan ID Rekam Medis (misalnya `P-101`).
   - **Tujuan:** Membuktikan kamu menguasai _request-response_ standar gRPC.
2. **Fitur Pemantauan Tanda Vital (Vitals Monitor - Bi-directional Streaming)**
   - **Logika:** Sensor (klien 2) yang menempel pada pasien `P-101` mengirimkan detak jantung (BPM) setiap 1 detik tanpa henti ke server. Di saat yang sama melalui koneksi yang sama, server mengawasi angka tersebut. Jika detak jantung anjlok ke angka kritis (misal di bawah 50 BPM), server langsung "menembakkan" peringatan bahaya kembali ke mesin sensor tersebut agar berbunyi.
   - **Tujuan:** Membuktikan kamu bisa menangani aliran data dua arah secara _real-time_ dan asinkron tanpa memutus koneksi.
3. **Fitur Dasbor Triage Dokter (Triage Dashboard - Server-side Streaming)**
   - **Logika:** Dokter (klien 3) membuka aplikasi dan melakukan satu _request_ koneksi. Server membalas dengan terus-menerus mengirimkan daftar antrean pasien secara _streaming_. Jika sensor pasien `P-101` (dari fitur 2) mengirim data kritis, server secara otomatis akan menyusun ulang antrean, menaruh `P-101` di urutan paling atas, dan mengirimkan _update_ layar itu ke dokter secara langsung.
   - **Tujuan:** Membuktikan kamu menguasai konsep _Server Push_ untuk aplikasi _dashboard monitoring_.
