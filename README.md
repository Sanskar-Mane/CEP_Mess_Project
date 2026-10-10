# 🎓 Avasari Connect (`CEP_Mess_Project`)

A unified campus dining, living, and transit ecosystem designed for engineering students and local vendors around **GCOEARA (Avasari Khurd)**.

---

## 🏗️ Monorepo Architecture

```
CEP_Mess_Project/
├── backend/          # Express 5 + Node.js + Mongoose (MongoDB Atlas) + Socket.io
├── frontend/         # React 19 + Vite + Tailwind CSS v4 + VitePWA (Web Application)
├── avasari-mobile/   # Expo SDK 57 + React Native 0.86 + Expo Router (Mobile App)
├── render.yaml       # Cloud deployment blueprint for Backend
└── README.md         # Production documentation & setup guide
```

---

## ⚡ Core Features & Capabilities

- **🍽️ Mess Dining & Live Menus**: Today's menus, meal cut-off lock timers (morning & evening), advance skip notifications, and student subscriptions.
- **🛡️ QR Meal Pass & Anti-Theft Dining**: Cryptographically signed single-use meal passes; mess owner counter scanner with duplicate claim prevention.
- **💳 FinTech UPI Payments**: In-app merchant UPI launcher, 12-digit UTR submission, and owner verification dashboard.
- **🍲 Smart Kitchen Ration Estimator**: Headcount-to-ingredient translator (Rice, Atta, Dal, Veggies) and food waste prevented quantifier.
- **🏠 PG/Hostel Vacancy Portal**: Filterable accommodation directory with live vacancies, rent, amenities, gender preferences, and one-tap calling.
- **🛺 Campus Auto-Pooling (Ride-Sharing)**: Real-time ride board for campus-to-town transit with live seat reservations and dynamic fare splitting.
- **📍 Geospatial Distance Engine**: MongoDB `2dsphere` and Haversine distance calculation rendering `"📍 X.X km away"` distance badges on maps.
- **⚡ Offline Resilience**: Workbox caching (`NetworkFirst` menus, `StaleWhileRevalidate` directory) on Web PWA, plus automatic `AsyncStorage` fallback on Mobile.
- **🔒 Security Hardened**: Helmet security headers, Gzip compression, multi-tier rate limiting, CORS origin isolation, and graceful container shutdown.

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- **Node.js** (v18.x or v20.x recommended)
- **MongoDB Atlas** database cluster (or local MongoDB URI)
- **Expo Go** app on your physical mobile phone (for testing `avasari-mobile`)

---

### 2. Environment Variables Configuration

#### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/mess_connect?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
# For local dev: http://localhost:3000 | For production Render backend:
VITE_API_URL=https://avasariconnectbackend.onrender.com
```

#### Mobile (`avasari-mobile/.env`)
Copy `avasari-mobile/.env.example` to `avasari-mobile/.env`:
```env
# For local dev: http://192.168.x.x:3000 | For production Render backend:
EXPO_PUBLIC_API_URL=https://avasariconnectbackend.onrender.com
```

---

### 3. Install Dependencies & Run Concurrently

Open 3 terminal windows to run all services:

#### Terminal 1 — Backend API & WebSockets
```bash
cd backend
npm install
npm run dev
# Server running at http://localhost:3000 (Health Check: http://localhost:3000/api/health)
```

#### Terminal 2 — Frontend Web PWA
```bash
cd frontend
npm install
npm run dev
# Web app running at http://localhost:5173
```

#### Terminal 3 — Mobile App (Expo)
```bash
cd avasari-mobile
npm install
npx expo start
# Scan the QR code using Expo Go on Android / iOS
```

---

## 🧪 Verification & Health Checks

Run verification tests across the monorepo:

```bash
# 1. Backend syntax check
node --check backend/server.js

# 2. Backend health endpoint check
curl http://localhost:3000/api/health

# 3. Frontend production PWA build
cd frontend && npm run build

# 4. Mobile TypeScript strict check
cd avasari-mobile && npx tsc --noEmit
```

---

## 🌐 Production Deployment Guide

### 1. Backend Web Service (Render / Railway)
- Use the included [render.yaml](file:///d:/CEP_Mess_Project/render.yaml) blueprint or configure manually:
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Health Check Path**: `/api/health`
  - **Environment Variables**:
    - `NODE_ENV`: `production`
    - `PORT`: `3000`
    - `MONGO_URI`: `<Atlas Connection String>`
    - `JWT_SECRET`: `<High-entropy 32+ character key>`
    - `ALLOWED_ORIGINS`: `https://your-frontend-domain.vercel.app`

### 2. Frontend Web PWA (Vercel)
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- The included [vercel.json](file:///d:/CEP_Mess_Project/frontend/vercel.json) handles client-side SPA routing (`/*` ➔ `/index.html`).

### 3. Mobile App (Expo Application Services / EAS)
- Configuration is pre-wired in [eas.json](file:///d:/CEP_Mess_Project/avasari-mobile/eas.json) and [app.json](file:///d:/CEP_Mess_Project/avasari-mobile/app.json):
  ```bash
  cd avasari-mobile

  # Install EAS CLI globally
  npm install -g eas-cli
  eas login

  # Build standalone Android APK for campus distribution:
  eas build --platform android --profile preview

  # Build Google Play production app bundle:
  eas build --platform android --profile production
  ```

---

## 📄 License
ISC © 2026 Avasari Connect Team
