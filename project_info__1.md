# School ERP / Guest Form — Full Codebase Overview

## Summary

This is a **school admission registration system** ("Guest Form" / "Aadishri school registration") built as two independent apps: an **ASP.NET Core 8 Web API** backend (MySQL via EF Core + Dapper, JWT auth, CAPTCHA) and an **Angular 17** frontend (standalone components, AG-Grid tables). Students register with their academic profile (board → session → school → class → stream → specialization), an **admin** reviews/approves or rejects those registrations, and both sides get role-tailored dashboards.

The codebase is a **work-in-progress ERP** — the repository name (`School_ERP`), the `program.cs` migration logic, and the `FullConfigurations` hierarchy snapshot feature all indicate an active feature build-out.

## Architecture

- **Pattern**: Client-server, REST API. The frontend is a layered Angular SPA (components → services → HTTP client → backend); the backend is a conventional ASP.NET Core controller-per-resource API.
- **Stack**:
  - Backend: .NET 8, ASP.NET Core Web API, EF Core (Pomelo MySQL provider) + **Dapper** for all stored-proc data access, JWT Bearer auth, SkiaSharp CAPTCHA, Swagger.
  - Frontend: Angular 17 (standalone components, no NgModules), RxJS, AG-Grid Community (v32) for data tables, Bootstrap Icons, jsPDF/jspdf-autotable + xlsx for report export, Reactive Forms.
  - Database: MySQL (`company_db`).
- **Data access quirk**: EF Core is *only* used for `Database.EnsureCreated()` and seeding the admin user at startup. All *runtime* data access goes through **Dapper + stored procedures** referenced as string constants in `backend/Data/StoredProcedures.cs`.
- **Auth model**: JWT (HS256, 8-hour expiry) with the `storage key` `auth_user` in `localStorage`. Roles are `Admin` and `User` (regular students).
- **Entry points**:
  - Frontend: `frontend/src/main.ts` → `bootstrapApplication(AppComponent, appConfig)` → `AppComponent` renders the app shell (sidebar + topbar) or auth-only layout; routes in `app.routes.ts` (all lazy-loaded).
  - Backend: `backend/Program.cs` builds the app, runs a large inline bootstrap block that creates tables/migrations, then maps controllers.

## Directory Structure

```
Guest_Form_Main/
├── backend/                          — ASP.NET Core 8 Web API
│   ├── Program.cs                    — DI, JWT, CORS, Swagger + HUGE startup schema bootstrap/migration block
│   ├── appsettings.json              — config template (placeholders; real secrets go in gitignored appsettings.Development.json)
│   ├── EmployeeApi.csproj            — .NET 8, Pomelo EF, Dapper, JWT, BCrypt, SkiaSharp
│   ├── Controllers/                  — Auth, Students, SchoolBoards, Schools, Classes, Sessions, Streams, Specializations, FullConfiguration
│   ├── DTOs/                         — CreateDto / UpdateDto / ResponseDto per resource
│   ├── Models/                       — EF entities (also used as Dapper query targets)
│   ├── Data/
│   │   ├── AppDbContext.cs           — EF mappings, table config
│   │   ├── DapperContext.cs          — MySqlConnection factory
│   │   ├── StoredProcedures.cs       — all stored-proc name constants
│   │   ├── full_database.sql         — canonical schema script
│   │   └── seed_data.sql             — seed data
│   ├── Helpers/CaptchaGenerator.cs   — SkiaSharp CAPTCHA image generation
│   └── Properties/launchSettings.json
└── frontend/                         — Angular 17 SPA
    ├── angular.json / package.json   — Angular CLI 17, AG-Grid, jsPDF, xlsx
    └── src/
        ├── main.ts                   — bootstrapApplication
        ├── styles.css                — global theme (light/dark), AG-Grid theme overrides, shared button/table styles
        ├── environments/             — apiUrl: dev=localhost:5059/api, prod=ngrok placeholder
        └── app/
            ├── app.component.*       — root shell: sidebar, topbar, theme toggle, profile menu, change-password modal
            ├── app.config.ts         — providers: router + HttpClient with authInterceptor
            ├── app.routes.ts         — lazy routes with authGuard/adminGuard
            ├── guards/               — auth.guard.ts, admin.guard.ts
            ├── interceptors/auth.interceptor.ts — attaches JWT, handles 401
            ├── models/               — TS interfaces mirroring backend DTOs
            ├── services/             — one HTTP service per backend controller
            └── components/
                ├── captcha.component.ts        — CAPTCHA widget (shared by login/signup)
                ├── login/ signup/              — public auth pages
                ├── dashboard/                  — admin overview
                ├── student-dashboard/          — student portal (status, notifications, profile %)
                ├── student-form/               — registration form + AG-Grid of own students + cascading lookups
                ├── student-report/             — admin review table (approve/reject)
                ├── education-board/ school/ classes/ sessions/ streams/ specialization/ — master-data CRUD pages
                ├── full-configuration/         — hierarchy snapshot feature
                ├── master-report/              — aggregate reporting
                └── shared/filter-grid/         — reusable AG-Grid wrapper with filter row + action buttons
```

## Key Abstractions

### AppComponent (root shell)
- **File**: `frontend/src/app/app.component.ts`
- **Responsibility**: The application shell — decides between signed-in shell (sidebar + topbar) vs auth-only layout, manages dark mode, profile dropdown, change-password modal, logout.
- **Interface**: `toggleTheme()`, `toggleProfile()`, `openPasswordModal()`, `changePassword()`, `logout()`, `showShell()`, `showSidebar()`, `profileInitials()`, `avatarColor()`, `isSidebarRoute()`.
- **Lifecycle**: Bootstrapped once by `main.ts`; lives for the entire SPA session; destroys when the tab closes.
- **Used by**: Every routed component renders inside its `<router-outlet />`. `showShell()` returns false on `/login` and `/signup` routes, swapping to the auth-only template.
- **Note on the specific asked-about code** — the theme init:
  ```typescript
  ngOnInit(): void {
    this.isDarkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();
  }
  ```
  The root component's lifecycle hook reads the cached theme preference from `localStorage` (key `"theme"`), maps it to the `isDarkMode` boolean, and immediately calls `applyTheme()` — which toggles the `dark-mode` CSS class on `<body>`:
  ```typescript
  private applyTheme(): void {
    document.body.classList.toggle('dark-mode', this.isDarkMode);
  }
  ```
  The `dark-mode` class on `body` is the **single source of truth** for theming: global `styles.css` uses `body.dark-mode` overrides, and the component CSS uses `:host-context(.dark-mode)`. There is no Angular `ThemeService` — theming lives entirely in `AppComponent` state + `localStorage` + a body class. Persistence happens on toggle: `localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')`.

### AuthService
- **File**: `frontend/src/app/services/auth.service.ts`
- **Responsibility**: Holds the authenticated user in a `BehaviorSubject<AuthResponse | null>` (hydrated from `localStorage` key `auth_user` on construction); exposes login/register/change-password/logout; provides `isLoggedIn()`, `isAdmin()`, `getToken()`.
- **Interface**: `login(credentials)`, `register(payload)`, `changePassword(current, new)`, `logout()`, `getCaptcha()`, `currentUser$`, `currentUser`, `getToken()`, `isLoggedIn()`, `isAdmin()`.
- **Lifecycle**: `providedIn: 'root'` singleton; state survives page reload via localStorage.
- **Used by**: `AppComponent`, `LoginComponent`, `SignupComponent`, `StudentFormComponent`, `StudentDashboardComponent`, both guards, the interceptor.

### AuthController (backend)
- **File**: `backend/Controllers/AuthController.cs`
- **Responsibility**: CAPTCHA issuance, register, login, change-password; mints HS256 JWTs with 8-hour expiry.
- **Interface**: `GET /api/Auth/captcha`, `POST /api/Auth/register`, `POST /api/Auth/login`, `POST /api/Auth/change-password` (`[Authorize]`).
- **Non-obvious behavior**: CAPTCHA verification is **skipped entirely in Development** (`if (_env.IsDevelopment()) return true;`). CAPTCHAs are stored in `IMemoryCache` with a 5-minute expiry, and are **single-use** (removed after validation).

### StudentsController
- **File**: `backend/Controllers/StudentsController.cs`
- **Responsibility**: Full CRUD for student registrations + admin approval/rejection + the cascading lookup endpoints used by the registration form.
- **Interface**: `GET /api/Students?includeInactive`, `GET /api/Students/{id}` (Admin), `GET /api/Students/my` (own submissions), `POST /api/Students`, `PUT /api/Students/{id}`, `DELETE /api/Students/{id}` (soft), `POST /{id}/approve`, `POST /{id}/reject`, plus lookup chain: `boards` → `boards/{boardId}/sessions` → `.../schools` → `.../classes` → `classes/{classId}/streams` → `classes/{classId}/specializations`.
- **Lifecycle**: `[Authorize]` on the controller; admin-only endpoints via `[Authorize(Roles = "Admin")]`.
- **Non-obvious invariants** (see Non-Obvious Behaviors below): one-entry-per-user, email uniqueness, ownership guards, soft deletes.
- **Used by**: `StudentService` (frontend), which in turn feeds `StudentFormComponent`, `StudentDashboardComponent`, and `StudentReportComponent`.

### DapperContext + StoredProcedures
- **Files**: `backend/Data/DapperContext.cs`, `backend/Data/StoredProcedures.cs`
- **Responsibility**: `DapperContext` opens a fresh `MySqlConnection` per call (no connection pooling logic of its own — it relies on ADO.NET pooling behind the scenes). `StoredProcedures` is a static class of string constants naming every `sp_*` procedure.
- **Used by**: Every controller. This is the actual data layer; the `.sql` files must stay in sync with these constants.

### FilterGridComponent (shared)
- **File**: `frontend/src/app/components/shared/filter-grid/filter-grid.component.ts`
- **Responsibility**: Reusable AG-Grid wrapper: takes `rows`, `columns`, and `actions`, renders a grid with floating filters and an actions column, emits `(action)` with `{ id, row }`.
- **Used by**: Master-data pages (classes, streams, etc.) for consistent table UX.

### StudentFormComponent
- **File**: `frontend/src/app/components/student-form/student-form.component.ts`
- **Responsibility**: The student registration form with reactive validation, a custom calendar picker for DOB, cascading dropdowns (board → session → school → class → stream/specialization), AG-Grid of existing students (admin sees all; non-admin sees own), and inline edit/delete/view.
- **Notable behavior**: Non-admins with exactly one record get **auto-edited** (`autoEditIfOwnRecord()`). The form requires a `termsAccepted` checkbox. Specializations are only offered when the selected class is `XI` or `XII`.

## Data Flow

### 1. Login flow
1. User opens app → `AppComponent.showShell()` returns false on `/login` → auth-only template renders.
2. `LoginComponent` renders `CaptchaComponent`; CAPTCHA fetches `GET /api/Auth/captcha` → SkiaSharp image + `captchaId` (cached 5 min in memory).
3. Submit → `AuthService.login()` → `POST /api/Auth/login` → backend validates CAPTCHA (skipped in dev), BCrypt-verifies password, mints JWT → frontend stores `{token, username, role}` in localStorage under `auth_user` and updates `currentUserSubject`.
4. Redirect: admin → `/dashboard`, regular user → `/submit`.
5. Every subsequent HTTP request passes through `authInterceptor`, which clones the request with `Authorization: Bearer <token>` and force-logs-out + redirects on any 401 **except** `/Auth/` endpoints (where a 401 just means wrong credentials).

### 2. Student registration flow
1. `StudentFormComponent.ngOnInit()` → `loadBoards()` (fills first dropdown) + `loadStudents()`.
2. `loadStudents()` picks `getStudents()` (admin) vs `getMyStudents()` (user).
3. User cascades through Board → Session → School → Class; each change calls a nested lookup endpoint (`StudentService.getSessions/getSchools/getClasses`), resetting downstream dropdowns.
4. Selecting a class triggers `getStreams(classId)`; if class name is `XI`/`XII`, also `getSpecializations(classId)`.
5. Submit → `createStudent` or `updateStudent` → backend checks: non-admin "already has active entry" guard (409 Conflict), email uniqueness (409), ownership for edits (403 Forbid) → Dapper stored proc inserts → returns `StudentResponseDto` (with denormalized names: `boardName`, `className`, etc.).
6. New record lands in the AG-Grid; non-admin success resets the form and reloads the grid.

### 3. Admin review flow
1. Admin opens `/admin` → `StudentReportComponent` → `StudentService.getStudents()` (all active).
2. Approve → `POST /api/Students/{id}/approve` → stored proc sets `Status='Approved'`, records `ReviewedBy`/`ReviewedDate`.
3. Reject → `POST /api/Students/{id}/reject` with optional note → sets `Status='Rejected'` + `ReviewNote`.
4. Student sees status on `/student-dashboard` (`StudentDashboardComponent`) — Approved → "Registered", Rejected → shows review note, else "Under Review"; builds notifications and a profile completeness percentage.

### 4. Master data flow
- Each master page (boards, schools, classes, sessions, streams, specializations) follows the same pattern: `[Authorize(Roles="Admin")]` controller → Dapper stored proc → Angular service → CRUD component using `FilterGridComponent`.
- Delete is always **soft** (sets `DeletedBy`/`DeletedDate`) and is **blocked if active children reference the record** (e.g., can't delete a board with active schools — backend checks `sp_SchoolBoards_ActiveSchoolsCount` and returns 409).

### 5. Full configuration (hierarchy snapshot)
- `FullConfigurationController` walks the hierarchy upward from a class (`sp_Class_GetById` → `sp_School_GetById` → `sp_SchoolBoard_GetById`), snapshots the streams/specializations of that class as comma-separated strings, and saves a denormalized row. This is the "save a complete setup" feature.

## Non-Obvious Behaviors & Design Decisions

1. **EF Core is only a schema-bootstrap tool.** `Program.cs` calls `Database.EnsureCreated()` and then a long chain of defensive `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` statements. All runtime queries use Dapper stored procedures. This means:
   - The stored procedures must exist in the database for the app to work — they're **not created by `EnsureCreated()`**. They come from `backend/Data/full_database.sql` / `seed_data.sql` or manual provisioning. **If a fresh DB is created and the SPs aren't loaded, every endpoint 500s.**
   - Schema evolution is handled by hand-written idempotent `IF NOT EXISTS` checks in `Program.cs` (e.g., migrating `Classes.Name` → `Classes.Class`, adding `Streams.Acronym`, `Specializations.StreamId`, `Students.Status`). No EF migrations are used.

2. **Dev-mode CAPTCHA bypass.** `AuthController.IsCaptchaValid()` returns `true` in `IHostEnvironment.IsDevelopment()`. So in local dev, login/register work with any CAPTCHA answer — but the client still requires `captchaId` + non-empty `captchaAnswer` to be present in the form.

3. **Default admin is seeded with a known password.** `Program.cs` seeds `admin` / `123456789` if the users table is empty. The README tells you to change it immediately. This is a latent security footgun if deployed without change.

4. **Two theming systems exist simultaneously.** `AppComponent` has its own `--paper/--ink/--brass` CSS variable set plus a `dark-mode` body class toggle, while `styles.css` defines a second `:root` variable set (also `--paper`, `--brass`, etc.) with its own `body.dark-mode` overrides. Both live together; the global `styles.css` overrides component styles with `!important` in dark mode. This is duplicated/overlapping design — changes to one theme system may not propagate to the other.

5. **Placeholder config in `appsettings.json`.** The committed `appsettings.json` has `Pwd=CHANGE_ME` and a placeholder JWT key. Real values belong in `appsettings.Development.json` (gitignored). Running the backend as-is against the committed template fails (bad password / weak secret).

6. **Production API URL is a hard-coded ngrok placeholder.** `frontend/src/environments/environment.prod.ts` points at `https://YOUR-NGROK-SUBDOMAIN.ngrok-free.app/api` — a build will hit a dead URL unless this is replaced; the README also flags the ngrok free-tier interstitial that breaks HttpClient unless the `ngrok-skip-browser-warning: true` header is added (the current `auth.interceptor.ts` does **not** add it).

7. **Soft deletes everywhere.** Every resource (boards, schools, classes, sessions, streams, specializations, students, full configurations) has `IsActive`, `DeletedBy`, `DeletedDate` columns. Deletes are "soft" — a `NoContent()` response after `sp_*_Delete`, but the row stays. Master-data deletes are blocked by referential-child counts (409 with a friendly message).

8. **One-entry-per-user for non-admins.** `sp_Students_UserHasActiveEntry` blocks a non-admin from creating a second student record (409 message: "You have already registered a student…"). The frontend compensates by auto-entering edit mode when a non-admin has exactly one row (`autoEditIfOwnRecord`).

9. **Ownership guards on edit/delete.** Non-admin users can only modify students where `InsertedBy == username`; otherwise the API returns `403 Forbid`. Admins bypass ownership.

10. **Email uniqueness on Students is a hard DB unique index** (`UX_Students_Email` in `AppDbContext` and `CREATE TABLE`) plus a pre-check stored proc that returns a friendly 409 instead of a raw DB 500.

11. **Stored procedure name collisions / duplication.** `FullConfigurationController` references `sp_School_BoardExists` (which sounds like a Schools SP) for a board-exists check; header area has both `sp_Class_GetAll` and `sp_Specialization_GetAll` etc. The naming is loose — be careful when hunting for a specific proc.

12. **Dedupication on the fly in master-data GETs.** `SchoolBoardsController.GetSchoolBoards()` and `ClassesController.GetClasses()` group results in C# to remove duplicates (e.g., by `UniversityName.Trim().ToUpperInvariant()`), keeping the newest Id. This hides legacy duplicate data — a signal the DB has accumulated duplicates from earlier migrations.

13. **AG-Grid cell renderers return raw HTML strings.** Since AG-Grid creates DOM outside Angular's component styles, the grid renderer styles live in **global** `styles.css` (`.grid-student-cell`, `.grid-badge`, `.grid-action`, etc.), and the component uses a manual `escapeHtml()` to avoid XSS from user-entered names/emails. The cell values are deliberately escaped.

14. **`change-password` is a separate authorised endpoint** (`POST /api/Auth/change-password`), invoked from the AppComponent's modal. It verifies the current password via BCrypt before writing the new hash. Unlike login/register it has no CAPTCHA. Password change does **not** invalidate existing JWTs.

15. **`authInterceptor` 401 handling has an interesting edge.** It skips auto-logout for URLs containing `/Auth/` so that a failed login doesn't nuke the session. But note `change-password` also lives under `/Auth/` — so a 401 from `change-password` (e.g., "Unable to identify the current user") will **not** trigger a redirect to `/login`. Worth remembering if you add other authorised endpoints under `/Auth/`.

## Module Reference (Frontend)

| File | Purpose |
|------|---------|
| `frontend/src/main.ts` | Bootstrap entry: `bootstrapApplication(AppComponent, appConfig)` |
| `frontend/src/app/app.component.ts` | Root shell: theme toggle, profile dropdown, password modal, sidebar routing logic |
| `frontend/src/app/app.config.ts` | DI providers: router, HttpClient + authInterceptor |
| `frontend/src/app/app.routes.ts` | All lazy routes + guards |
| `frontend/src/app/services/auth.service.ts` | Auth state (BehaviorSubject + localStorage), login/register/change-password/logout |
| `frontend/src/app/services/student.service.ts` | All student + cascade-lookup HTTP calls |
| `frontend/src/app/services/school-board.service.ts` | Board CRUD |
| `frontend/src/app/services/classes.service.ts` | Class CRUD |
| `frontend/src/app/services/sessions.service.ts` | Session CRUD |
| `frontend/src/app/services/streams.service.ts` | Stream CRUD |
| `frontend/src/app/services/specialization.service.ts` | Specialization CRUD |
| `frontend/src/app/services/full-configuration.service.ts` | Full-config snapshot CRUD |
| `frontend/src/app/guards/auth.guard.ts` | Redirects to `/login` if unauthenticated |
| `frontend/src/app/guards/admin.guard.ts` | Redirects non-admins to `/submit`, anonymous to `/login` |
| `frontend/src/app/interceptors/auth.interceptor.ts` | Attaches Bearer token; handles 401 auto-logout (except `/Auth/`) |
| `frontend/src/app/components/captcha.component.ts` | CAPTCHA image + answer input (two-way via `valueChange`) |
| `frontend/src/app/components/login/login.component.ts` | Login form + CAPTCHA + redirect by role |
| `frontend/src/app/components/signup/signup.component.ts` | Self-registration as `User` role |
| `frontend/src/app/components/student-form/student-form.component.ts` | The big one: registration form, cascading selects, AG-Grid, edit/view/delete |
| `frontend/src/app/components/student-dashboard/student-dashboard.component.ts` | Student portal: status card, notifications, profile % |
| `frontend/src/app/components/student-report/student-report.component.ts` | Admin review grid with approve/reject actions |
| `frontend/src/app/components/dashboard/dashboard.component.ts` | Admin overview |
| `frontend/src/app/components/education-board/school/classes/sessions/streams/specialization/*.ts` | Master-data CRUD pages (all use FilterGridComponent) |
| `frontend/src/app/components/full-configuration/full-configuration.component.ts` | Hierarchy snapshot builder |
| `frontend/src/app/components/master-report/master-report.component.ts` | Report/export page |
| `frontend/src/app/components/shared/filter-grid/filter-grid.component.ts` | Reusable AG-Grid with filters + actions column |
| `frontend/src/styles.css` | Global theme variables, dark-mode overrides, AG-Grid theme, grid renderer styles, action button styles |

## Module Reference (Backend)

| File | Purpose |
|------|---------|
| `backend/Program.cs` | DI registration (EF + Dapper + JWT + CORS + Swagger), schema bootstrap and migrations, admin seeding |
| `backend/Controllers/AuthController.cs` | CAPTCHA, register, login, change-password, JWT minting |
| `backend/Controllers/StudentsController.cs` | Student CRUD + approve/reject + lookup chain |
| `backend/Controllers/SchoolBoardsController.cs` | Board CRUD with duplicate-dedup on GET |
| `backend/Controllers/SchoolsController.cs` | School CRUD |
| `backend/Controllers/ClassesController.cs` | Class CRUD with dedup + child-guards on delete |
| `backend/Controllers/SessionsController.cs` | Session CRUD |
| `backend/Controllers/StreamsController.cs` | Stream CRUD |
| `backend/Controllers/SpecializationsController.cs` | Specialization CRUD (XI/XII eligibility) |
| `backend/Controllers/FullConfigurationController.cs` | Walk hierarchy + snapshot streams/specializations |
| `backend/Data/AppDbContext.cs` | EF entity configuration (used only for schema bootstrap) |
| `backend/Data/DapperContext.cs` | MySqlConnection factory |
| `backend/Data/StoredProcedures.cs` | All stored-proc name constants |
| `backend/Data/full_database.sql` | Canonical schema + stored procs |
| `backend/Data/seed_data.sql` | Seed data |
| `backend/Helpers/CaptchaGenerator.cs` | SkiaSharp CAPTCHA rendering |
| `backend/Models/*.cs` | EF entities / Dapper result targets |
| `backend/DTOs/*.cs` | Create/Update/Response DTOs |
| `backend/EmployeeApi.csproj` | Package references |

## Suggested Reading Order

1. `backend/Program.cs` — Start here for the whole system's shape: DI, auth, CORS, and the massive schema-bootstrap block that explains how the DB actually comes to exist.
2. `backend/Data/StoredProcedures.cs` + `backend/Data/DapperContext.cs` — Understand the real data-access layer (all runtime SQL lives behind these names).
3. `backend/Controllers/StudentsController.cs` — The most fully-featured controller; shows the authz model, soft-delete pattern, ownership guards, and the cascade lookup design.
4. `frontend/src/app/app.component.ts` — The root shell where the user's question lives; shows theme persistence, the auth-aware layout switch, and the profile/password UI.
5. `frontend/src/app/services/auth.service.ts` — The auth state container; explains `isLoggedIn`/`isAdmin`/token flow used everywhere.
6. `frontend/src/app/components/student-form/student-form.component.ts` — The most complex frontend component; shows the full registration UX: cascading dropdowns, AG-Grid with raw-HTML renderers, edit/delete flows.
7. `frontend/src/app/app.routes.ts` + `guards/*` — How navigation and role protection tie together.
