# Grievance Portal

<p align="center">
  <img src="grievance-portal/public/gov-emblem.svg" alt="Project Emblem" width="110" />
</p>

A Final Year Major Project focused on digitizing public grievance redressal through a secure, role-based, multilingual web platform.

## Abstract

The Grievance Portal is a full-stack web-based grievance redressal system developed as a final year major project to improve transparency, accessibility, and efficiency in complaint management. The platform enables citizens to register grievances, track status updates, and receive notifications, while officers and administrators process complaints through structured dashboards and role-based workflows. The system is implemented using React, TypeScript, Node.js, Express, and MongoDB, with JWT-based authentication and cloud-integrated media support. It also incorporates multilingual support and map-based location tagging to improve usability in diverse user environments. The proposed solution demonstrates a practical, scalable, and deployment-ready model for digital governance and institutional complaint resolution.

## Keywords

E-Governance, Grievance Redressal, Role-Based Access Control, MERN Stack, JWT Authentication, Complaint Tracking, Full-Stack Web Application

## 1. Project Overview

The Grievance Portal is designed to streamline complaint submission, tracking, and resolution across three stakeholder roles:
- Citizen (`user`)
- Officer
- Admin

The system reduces manual paperwork, improves transparency, and provides structured workflows for grievance handling.

## 2. Problem Statement

Conventional grievance handling in many institutions is slow, non-transparent, and hard to monitor. Citizens often lack visibility into complaint status, while administrators struggle with analytics and workload distribution.

## 3. Objectives

- Build a centralized portal for complaint registration and lifecycle tracking.
- Provide role-based access control for citizens, officers, and administrators.
- Improve accountability with status history and notifications.
- Support multilingual access (English, Hindi, Urdu) for inclusivity.
- Enable deployment-ready architecture for real-world use.

## 4. Repository Structure

- `grievance-portal/`: React + Vite frontend
- `backend/`: Node.js + Express + MongoDB API

## 5. Major Features

- Citizen complaint filing (form + voice flow)
- Draft save/resume/delete for complaints
- Complaint tracking and status history
- Notification system (read/archive actions)
- Officer queue and department-level processing
- Admin dashboards (analytics, departments, users, complaints, reports, settings)
- Interactive map-based location selection (Leaflet)
- Accessibility baseline (skip link, focus visibility, ARIA improvements)

## 6. Technology Stack

- Frontend: React, TypeScript, Vite, Tailwind, shadcn/ui, Recharts, React Router, React Leaflet
- Backend: Express, Mongoose, JWT Authentication, Multer + Cloudinary, Nodemailer, Twilio
- Database: MongoDB
- Containerization: Docker, Docker Compose

## 7. System Modules

- Authentication & Authorization module
- Complaint Management module
- Officer Workflow module
- Admin Monitoring & Analytics module
- Notification module (email/SMS)

## 8. Environment Variables

### Backend (`backend/.env`)

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
- `VITE_GOOGLE_CLIENT_ID` (for Google Sign-In)

## 9. Local Development Setup

### Backend

```powershell
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

### Frontend

```powershell
cd grievance-portal
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## 10. Production Build

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

## 11. Docker Deployment

From repository root:

```powershell
docker compose up --build
```

Access:
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- Health Endpoint: `http://localhost:5000/health`

Stop containers:

```powershell
docker compose down
```

## 12. API Route Groups

- `/api/auth`
- `/api/complaints`
- `/api/officer`
- `/api/admin`

## 13. Project Outcomes

- Implemented end-to-end grievance lifecycle management.
- Achieved role-specific workflows with secure JWT-based access.
- Delivered cloud-deployable architecture (Render/Vercel or Docker-hosted setup).
- Improved complaint visibility for citizens and operational tracking for administrators.

## 14. Limitations and Scope for Future Work

- Add AI-based grievance categorization and prioritization.
- Add automated E2E/UAT test coverage for all role flows.
- Add CI/CD pipelines (lint, type-check, build, smoke tests).
- Add SLA-based escalation engine and richer analytics.

## 15. Academic Note

This project is suitable for final year major project evaluation under full-stack web development, e-governance systems, and software engineering practice.
