# PRD — R&B Asset Management System

## 1. Problem statement
Build an end-to-end infrastructure asset inventory to track and manage assets across their entire lifecycle — for the Roads & Buildings (R&B) Department: roads, bridges, culverts, government buildings, residential quarters and road machinery.

## 2. Users
| Persona | App role | Goal |
|---|---|---|
| Chief Engineer / Head Office | ADMIN | State-wide view across all divisions, manage users, compare divisions |
| Executive Engineer (Division head) | MANAGER | Register assets in own division, move them through lifecycle, oversee maintenance |
| Assistant / Junior Engineer | OFFICER | View division assets, log maintenance and inspections |

## 3. Scope

### Must-have (MVP)
1. Credentials login with 3 roles
2. **Division-level data scoping**: MANAGER/OFFICER see only their division; ADMIN sees all
3. Asset registry for R&B categories with **category-specific fields** (road number, length, surface, spans, floors, etc.): create, view, edit, list with search/filter/sort/pagination
4. **Lifecycle tracking**: PLANNED → PROCURED → IN_SERVICE ⇄ UNDER_MAINTENANCE → DECOMMISSIONED → DISPOSED, with immutable history and a visual timeline
5. Maintenance records per asset (routine, periodic renewal, resurfacing, structural repair, emergency, inspection) with contractor, work order no., cost, next-due date
6. Dashboard: R&B KPIs (total road length, bridges, buildings, value, overdue maintenance) + charts + attention list
7. Role-based UI and API access
8. Deployed on Vercel with seeded demo data

### Nice-to-have (only after MVP is done and deployed)
- CSV export of asset list
- Map view using lat/lng
- QR code / printable asset sheet
- "Monsoon damage" emergency-repair KPI

### Explicitly out of scope
Multi-department tenancy, file uploads, notifications, mobile app, GIS integration, real depreciation accounting, tender/billing workflows.

## 4. Key user stories
- As an Executive Engineer, I add a road asset (SH-1 section, 26 km, bituminous, 4 lanes) to my division; it starts as PLANNED.
- As an EE, I move an asset to the next allowed status with remarks; it is recorded in history.
- As an AE, I log a resurfacing or emergency repair with contractor and work order no.; the next due date appears in upcoming maintenance.
- As any user, I search by name/code/road number and filter by status, category, condition (and division, if admin).
- As a Chief Engineer, I see state-wide totals and compare divisions.
- As a Manager, I can NOT see or touch assets of other divisions.
- As an Admin, I create users and assign role + division.

## 5. Acceptance criteria (demo checklist)
- [ ] Login works for all roles; wrong password shows error
- [ ] Manager (Ahmedabad) sees only Ahmedabad division assets; Admin sees all; direct URL to another division's asset gives 404 for Manager
- [ ] Officer cannot see "New Asset" or "Change Status" (UI hidden AND API returns 403)
- [ ] Asset form shows category-specific fields (e.g. surface/lanes for roads, spans for bridges, floors for buildings) and detail page displays them
- [ ] Invalid transition (e.g. PLANNED → DISPOSED) is rejected with a clear message
- [ ] Every transition appears in the asset timeline with user, date, remarks
- [ ] Maintenance records capture contractor and work order no.
- [ ] Dashboard numbers match DB (and respect division scope)
- [ ] Pagination + filters work with URL query params
- [ ] App is live on Vercel and usable at 390px width

## 6. Success = the 4-minute demo flow works flawlessly
Admin login → state-wide dashboard → switch to Manager (Ahmedabad) showing scoped data → add a road asset → move PLANNED→PROCURED→IN_SERVICE → log resurfacing maintenance → show timeline → login as Officer to show restricted access.
