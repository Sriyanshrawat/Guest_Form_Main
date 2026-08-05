# Guest Profile Management — Angular Frontend

This is a real Angular CLI workspace (Angular 17, standalone components).
Open this folder directly in VS Code — no extra setup to "convert" it.

## Getting started

```bash
npm install
ng serve
```

Then visit http://localhost:4200

- `/submit` — public Guest profile submission form
- `/admin`  — admin panel (list, inline edit, delete)

## Pointing at your backend

- `src/environments/environment.ts` — used by `ng serve` (dev). Defaults to
  `https://localhost:7000/api`, matching the .NET API's default HTTPS port.
- `src/environments/environment.prod.ts` — used by
  `ng build --configuration production`. Put your ngrok URL here, e.g.
  `https://your-subdomain.ngrok-free.app/api`.

`GuestService` (`src/app/services/Guest.service.ts`) reads only from
`environment.apiUrl` — that's the one place you touch when the tunnel URL
changes.

## ngrok gotcha

ngrok's free tier shows a browser warning interstitial to first-time
visitors, which will break HttpClient calls unless you add the header
`ngrok-skip-browser-warning: true` to requests (e.g. via an HttpInterceptor)
or upgrade past the free tier.

## Project structure

```
src/app/
├── components/
│   ├── Guest-form/     # public submission form (Reactive Forms)
│   └── Guest-admin/    # admin list/edit/delete panel
├── models/Guest.model.ts
├── services/Guest.service.ts
├── app.routes.ts
└── app.component.*        # nav shell
```

## Backend & database

The matching .NET Core Web API and MySQL schema are in the sibling
`backend/` and `database/` folders of the parent zip.
