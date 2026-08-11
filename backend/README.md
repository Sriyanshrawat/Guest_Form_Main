# Guest Form — ASP.NET Core Web API

ASP.NET Core 8 Web API backing the Guest Form / Aadishri school registration
app. Manages school boards, schools, sessions, classes, streams,
specializations, and student registrations, with JWT auth and a CAPTCHA
gate on login/signup.

## First-time setup

1. Make sure MySQL is running locally and you know the root (or a
   dedicated) user's credentials.
2. Edit `appsettings.Development.json` (create it if missing — it's
   gitignored) and set your real values:
   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Port=3306;Database=company_db;Uid=root;Pwd=YOUR_PASSWORD;SslMode=None;AllowPublicKeyRetrieval=True;"
     },
     "Jwt": {
       "Key": "a-long-random-secret-at-least-32-characters",
       "Issuer": "GuestApi"
     }
   }
   ```
   `appsettings.json` only holds placeholder values — it's the template
   that ships with the repo. Don't put real credentials there.
3. Restore + run:
   ```bash
   dotnet restore
   dotnet run
   ```

On first run, the app automatically creates the database and tables
(`Database.EnsureCreated()` in `Program.cs`) and seeds a default admin
user with a **randomly generated, one-time password** that is printed to
the console:

```
A default 'admin' account was created with a generated password.
      username: admin
      password: <random>
```

A known password is never shipped with the codebase. Log in with the
printed password and change it immediately from the profile menu.

If you already have an existing database from an earlier version of the
app, `Program.cs` also runs a set of defensive `ALTER TABLE` checks on
startup to bring older schemas up to date (added columns, renamed
columns, etc.) without needing a full migration run. It also **loads the
stored procedures** from `Data/full_database.sql` automatically whenever
any are missing, so a freshly created database works without manually
running the script.

## Authentication

Sessions use JWT bearer tokens that the server sets as an **HttpOnly
cookie** (`auth_token`). The cookie keeps the token out of JavaScript
scope (no more localStorage), and the Angular app sends it back
automatically. Swagger's "Authorize" button still works via the
`Authorization: Bearer` header.

The brute-forceable auth endpoints (`/api/auth/captcha`,
`/api/auth/login`, `/api/auth/register`) are rate-limited to 10 requests
per minute per client IP and return `429 Too Many Requests` when
exceeded.

Swagger UI opens automatically at `http://localhost:5059/swagger` (per
`Properties/launchSettings.json`). The Angular app's `environment.ts`
already points at this same port.

## Database scripts

`Data/full_database.sql` (this folder) is the canonical schema script —
it creates the tables and all stored procedures. `Data/seed_data.sql`
contains sample data. Run them in MySQL Workbench or via the `mysql`
CLI if you prefer to provision by hand instead of relying on
`EnsureCreated()`.

## Endpoints (high level)

| Area                | Route prefix              |
|----------------------|----------------------------|
| Auth                  | `/api/auth`                |
| Students              | `/api/students`            |
| School boards         | `/api/schoolboards`        |
| Schools               | `/api/schools`             |
| Classes               | `/api/classes`             |
| Sessions              | `/api/sessions`            |
| Streams               | `/api/streams`             |
| Specializations       | `/api/specializations`     |
| Full configuration    | `/api/fullconfiguration`   |

Full request/response shapes are in Swagger once the app is running.

## Project structure

```
backend/
├── Program.cs                    # EF Core + CORS + JWT + startup schema bootstrap
├── appsettings.json               # Config template (placeholders only)
├── appsettings.Development.json   # Real local secrets (gitignored)
├── Controllers/                    # One controller per resource
├── DTOs/                           # Create/Update/Response request shapes
├── Models/                         # EF Core entities
├── Data/AppDbContext.cs            # EF Core DbContext
└── Helpers/CaptchaGenerator.cs     # SkiaSharp-based CAPTCHA image generator
```

## Going public via ngrok

```bash
ngrok http https://localhost:7097
```

Copy the `https://xxxx.ngrok-free.app` URL ngrok gives you into the
Angular app's `src/environments/environment.prod.ts` as
`https://xxxx.ngrok-free.app/api`, then `ng build --configuration production`.

Note: ngrok's free tier shows a warning interstitial to first-time
visitors, which breaks plain HttpClient calls unless you add the header
`ngrok-skip-browser-warning: true` on requests.
