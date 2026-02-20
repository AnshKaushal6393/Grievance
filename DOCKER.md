# Docker Run Guide

## Prerequisites
- Docker Desktop installed and running.

## 1) Set optional frontend build variable
- PowerShell:
```powershell
$env:VITE_GOOGLE_CLIENT_ID="your_google_client_id"
```

If this is not set, Google Sign-In button will not render in frontend.

## 2) Start all services
From project root:
```powershell
docker compose up --build
```

## 3) Access
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

Frontend `/api/*` requests are proxied by nginx container to backend.

## 4) Stop
```powershell
docker compose down
```

## Notes
- Backend environment values are loaded from `backend/.env`.
- If you update dependencies, rebuild with:
```powershell
docker compose up --build
```
