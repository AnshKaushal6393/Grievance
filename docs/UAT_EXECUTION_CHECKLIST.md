# UAT Execution Checklist

Date: 2026-02-20  
Scope: Citizen, Officer, Admin role flows; error paths; maintenance/rate-limit/load checks.

## 1) Build and Static Validation

| Check | Command | Status | Notes |
|---|---|---|---|
| Frontend Type Check | `cd grievance-portal && npx tsc --noEmit` | PASS | Completed successfully. |
| Frontend Lint | `cd grievance-portal && npm run lint` | BLOCKED | ESLint config error: plugin `react-refresh` redefined (project config issue, not feature logic). |
| Backend Syntax | `node --check backend/index.js` | PASS | Valid syntax. |
| Backend Admin Route Syntax | `node --check backend/routes/admin.js` | PASS | Valid syntax. |
| Backend Officer Route Syntax | `node --check backend/routes/officer.js` | PASS | Valid syntax. |

## 2) Citizen Flow UAT

| Scenario | Expected | Status |
|---|---|---|
| Register/Login | User can authenticate and land on dashboard | READY FOR UAT |
| Save Draft Complaint | Draft saved and visible on dashboard | READY FOR UAT |
| Resume/Edit Draft | Draft can be resumed and updated | READY FOR UAT |
| Delete Draft | Confirmation and toast shown; draft removed | READY FOR UAT |
| Submit Complaint | Complaint created with tracking ID | READY FOR UAT |
| Track Complaint | Status timeline and details shown | READY FOR UAT |
| Language Switch (en/hi/ur) | Key pages switch language | READY FOR UAT |

## 3) Officer Flow UAT

| Scenario | Expected | Status |
|---|---|---|
| View Assigned/Queue | Officer sees department-relevant queue | READY FOR UAT |
| Open Complaint Details | View action opens complaint detail page | READY FOR UAT |
| Update Status Guard | Resolved complaints cannot be modified | READY FOR UAT |
| SLA Alerts View | Alerts list opens and is actionable | READY FOR UAT |
| Department Activity | Activity list opens and complaint links work | READY FOR UAT |

## 4) Admin Flow UAT

| Scenario | Expected | Status |
|---|---|---|
| Admin Dashboard Metrics | Live stats/charts render without demo fallback | READY FOR UAT |
| Complaint Ops | Assign/edit/escalate/close/delete workflows function | READY FOR UAT |
| Department Management | Add/edit/manage department and officer mapping | READY FOR UAT |
| User Management | Add/edit/ban/unban/reset/delete user actions work | READY FOR UAT |
| Reports | Preview/generate/download flows hit backend endpoints | READY FOR UAT |
| Settings | Save settings + broadcast + rotation actions work | READY FOR UAT |

## 5) Error Path UAT

| Scenario | Expected | Status |
|---|---|---|
| Backend 5xx | Error toast shown, UI remains usable | READY FOR UAT |
| Unauthorized (401/403) | Access blocked and redirected/logged out appropriately | READY FOR UAT |
| Not Found (404 complaint/user) | Friendly empty/error state displayed | READY FOR UAT |
| Validation Errors | Field-level or toast errors displayed; no silent failures | READY FOR UAT |
| Network Offline/Timeout | Retry-safe behavior and clear error messaging | READY FOR UAT |

## 6) Maintenance + Rate-Limit + Load UAT

| Scenario | Expected | Status | How to Execute |
|---|---|---|---|
| Maintenance Mode Enabled | Non-admin users see maintenance message/blocked routes | PENDING MANUAL | Toggle in `/admin/settings`, then verify citizen/officer routes. |
| API Rate Limit Lowered | Excess requests return `429` and UI handles gracefully | PENDING MANUAL | Set low limit in `/admin/settings`, hit key APIs rapidly. |
| Load Burst on Admin APIs | Dashboard/reports remain stable with controlled degradation | PENDING MANUAL | Use `autocannon`/`k6` against `/api/admin/*` endpoints. |
| Load Burst on Complaint APIs | Create/track/status endpoints return expected errors/latency bounds | PENDING MANUAL | Load test `/api/complaints/*` and `/api/officer/*`. |

## 7) Suggested Load Commands (Example)

```bash
# Example using autocannon (run when backend is up)
autocannon -c 25 -d 30 -m GET  http://localhost:5000/api/admin/dashboard
autocannon -c 25 -d 30 -m GET  http://localhost:5000/api/admin/complaints
autocannon -c 25 -d 30 -m GET  http://localhost:5000/api/officer/dashboard
autocannon -c 15 -d 30 -m POST -H "Content-Type: application/json" \
  -b "{\"title\":\"Load test\",\"description\":\"Load path\",\"category\":\"Other\"}" \
  http://localhost:5000/api/complaints
```

## 8) Exit Criteria

- All `READY FOR UAT` flows pass in browser/manual run.
- All `PENDING MANUAL` load/maintenance/rate-limit scenarios executed and recorded with evidence.
- Any failed case has reproducible steps, logs, and owner assignment.

