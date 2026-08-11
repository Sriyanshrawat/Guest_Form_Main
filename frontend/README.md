# Guest Form — Angular Frontend

Angular 17 SPA (standalone components) for the Guest Form / Aadishri school
registration app. Admin panel + student registration + review workflow.

## Getting started

```bash
npm install
ng serve
```

Then visit http://localhost:4200

Key routes (see `src/app/app.routes.ts`):

- `/login`, `/signup` — public auth pages (CAPTCHA protected)
- `/submit` — student registration form
- `/student-dashboard` — student portal (status, notifications)
- `/admin` — admin review grid (approve/reject)
- `/dashboard` — admin overview
- Master data pages: boards, schools, classes, sessions, streams,
  specializations, full configuration, master report

## Pointing at your backend

- `src/environments/environment.ts` — used by `ng serve` (dev). Defaults to
  `http://localhost:5059/api`, matching the .NET API's dev port.
- `src/environments/environment.prod.ts` — used by
  `ng build --configuration production`. Defaults to a relative `/api`, which
  works when the SPA and API are served from the same origin. If the backend
  is tunneled (e.g. ngrok), put the tunnel origin here, e.g.
  `https://your-subdomain.ngrok-free.app/api`.

## Authentication

The API authenticates with a JWT delivered as an **HttpOnly cookie**
(`auth_token`), so the token never touches JavaScript. The auth interceptor
(`src/app/interceptors/auth.interceptor.ts`) attaches `withCredentials` to
every request so the browser sends the cookie, and handles 401 auto-logout.

The same interceptor adds the `ngrok-skip-browser-warning: true` header that
ngrok's free-tier interstitial requires.

## Project structure

```
src/app/
├── components/            # feature components (login, signup, student-form,
│                          #   student-dashboard, student-report, dashboard,
│                          #   master-data pages, shared/filter-grid, ...)
├── guards/                # auth.guard.ts, admin.guard.ts
├── interceptors/          # auth.interceptor.ts (cookie + 401 handling)
├── models/                # TS interfaces mirroring the backend DTOs
├── services/              # one HTTP service per backend controller
├── app.component.*        # root shell (sidebar, topbar, theme, profile)
├── app.config.ts          # providers (router, HttpClient + interceptor)
└── app.routes.ts          # lazy routes with guards
```

## Backend & database

The matching ASP.NET Core 8 Web API and MySQL schema live in the sibling
`backend/` folder (see `backend/README.md`).
