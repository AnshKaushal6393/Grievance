# Grievance Portal

Government-style grievance redressal web platform with role-based workflows for:
- Citizen (`user`)
- Officer
- Admin

This repository contains:
- `grievance-portal/` -> React + Vite frontend
- `backend/` -> Node.js + Express + MongoDB API

## Core Features

- Citizen complaint filing (form + voice flow)
- Draft complaint save/resume/delete
- Complaint tracking and history
- Notifications with read/archive actions
- Officer dashboard and department queue
- Admin dashboards (analytics, departments, users, complaints, reports, settings)
- Multilingual UI (English, Hindi, Urdu)
- Interactive map location selection (Leaflet) across map-enabled pages
- Accessibility baseline (skip link, focus styles, aria improvements on major pages)

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, Recharts, React Router, React Leaflet
- Backend: Express, Mongoose, JWT auth, Multer + Cloudinary, Nodemailer, Twilio
- Database: MongoDB
- Infra: Docker + Docker Compose

## Prerequisites

- Node.js 18+ (recommended 20+)
- npm 9+
- MongoDB instance
- Cloudinary account (for media upload)

## Environment Variables

### Backend (`backend/.env`)
Required keys used by code:

- `PORT` (default `5000`)
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`
- `FRONTEND_URL`
- `GOOGLE_CLIENT_ID`
- `CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `TWILIO_COUNTRY_CODE`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Frontend (`grievance-portal/.env`)

- `VITE_API_URL` (example: `http://localhost:5000/api`)
- `VITE_GOOGLE_CLIENT_ID` (optional; needed for Google sign-in button)

## Local Development

### 1) Start backend

```powershell
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Start frontend

```powershell
cd grievance-portal
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Production Build

### Frontend

```powershell
cd grievance-portal
npm run build
```

### Backend

```powershell
cd backend
npm start
```

## Docker Run

From repo root:

```powershell
docker compose up --build
```

Access:
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- Health: `http://localhost:5000/health`

Stop:

```powershell
docker compose down
```

## API Route Groups

- `/api/auth`
- `/api/complaints`
- `/api/officer`
- `/api/admin`

## Current Scope Note (ML/AI)

The platform has AI-ready workflow hooks (voice metadata, analytics insights) but **custom trained ML models are not mandatory for core operation** and may not be integrated yet. Core grievance workflows work without ML training.

## Suggested Next Steps

1. Add backend-backed AI insight generation (replace any heuristic placeholders).
2. Add automated E2E/UAT test suite for all role flows.
3. Add CI pipeline (lint, type-check, build, backend smoke tests).
4. Add deployment docs for cloud target (Render/AWS/Azure/GCP).

