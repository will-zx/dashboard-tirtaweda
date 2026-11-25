# Tirtaweda · Smart Greenhouse Dashboard

Redesign dashboard monitoring dan kendali Smart Greenhouse dengan identitas visual **Tirtaweda**, dibangun menggunakan **React 19 + TypeScript + Vite + Tailwind CSS v4 + Chart.js + React Router**.

## Arsitektur & Jenis Web

- **Jenis Web**: **Static-Built Dynamic SPA (JAMstack)** — hasil build berupa aset statis (`dist/`) yang dapat di-deploy ke Cloudflare Pages / static host tanpa server backend khusus, namun berkomunikasi secara dinamis dengan **Firebase Realtime Database** dan **Firebase Authentication** melalui REST API.
- **Framework**: React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Chart.js 4 + Lucide React.

## Fitur Utama

- **Ringkasan Kondisi Greenhouse**: Metrik iklim mikro (Suhu, Kelembapan, Kadar Air Tanah + status 3 probe, VPD) dan Neraca Air & Irigasi (Dosis Harian dengan progress bar pemakaian, Air Terpakai, ETc).
- **Grafik Tren Iklim Mikro**: Grafik multi-sumbu interaktif 6 jam / 24 jam dengan toggle seri dan garis Target VPD.
- **Kendali Aktuator**: Misting dan Irigasi (`OFF` / `ON` / `AUTO`), Blower PWM (`0–100%` + preset cepat `0%`, `40%`, `70%`, `100%`), serta konfirmasi telemetri.
- **Fase & Setpoint**: Pemantauan progres fase berjalan dan pengaturan Target VPD, nama fase, serta durasi fase oleh admin.
- **Log Sensor**: Pencarian, filter rentang waktu, pagination, dan ekspor CSV (UTF-8 BOM).
- **Tema Gelap/Terang & Responsif**: Sidebar rail untuk desktop dan bottom navigation bar untuk mobile.

## Menjalankan

```bash
npm install
npm run dev
```

Build production dan unit test:

```bash
npm test
npm run build
```
