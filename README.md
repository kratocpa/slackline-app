# Slackline App

A full-stack web application for managing and sharing rigged slackline data — including locations, crossings, statistics, and a personal diary.

## Tech Stack

### Backend
- **FastAPI** (Python 3.12) – async REST API
- **SQLAlchemy 2.0** – async ORM with PostgreSQL
- **asyncpg** – async PostgreSQL driver
- **Google OAuth 2.0** – authentication via httpx-oauth (Google only)
- **JWT** – session tokens in httpOnly cookies
- **Pydantic v2** – validation & serialization

### Frontend
- **React 18** + TypeScript + Vite
- **Tailwind CSS** – utility-first styling
- **React-Leaflet / Leaflet** – interactive OpenStreetMap
- **TanStack Query v5** – server-state management & caching
- **Zustand** – client-state (auth, map bounds, filters)
- **Recharts** – statistics charts (bar charts)
- **react-dropzone** – image upload

### Infrastructure
- **Docker Compose** – local development with hot-reload
- **PostgreSQL 16** – primary database
- **Nginx** – production frontend serving & `/api` proxy

---

## Features

- **Interactive Map** — OpenStreetMap with pins for all slacklines at their anchor point; map viewport filters the table
- **Slackline List** — sortable, searchable, paginated table with cascading filters (State → Region → Sector)
- **Slackline Detail** — tabs: Information, Crossings, Photos, History, Statistics
- **Information tab** — full details, cover photo, anchor points (lat/lon/description), parking spot
- **Crossings tab** — list of who crossed, when, in what style; add crossing; delete your own crossing
- **Photos tab** — grid of crossing photos with lightbox
- **History tab** — full audit trail of all edits
- **Statistics tab** — crossing count, style distribution, top users, average rating
- **📓 Diary** — personal tab (logged-in users only) showing only the lines you've crossed, with two sub-tabs:
  - **My Lines** — table sorted by last crossed date, with crossing count per line
  - **Statistics** — your personal stats: lines crossed, total crossings, crossings by style, lines by length, lines by height, most visited lines
- **Crossing deletion** — crossing creator and admins can delete crossings
- **Cover photo** — each slackline can have a cover/hero photo
- **Google OAuth** — one-click login; account auto-created on first login
- **Permission system** — only creator or admin can edit/delete a slackline or crossing; any logged-in user can add a crossing
- **CSV import** — bulk import legacy data from Strapi CSV exports
- **Admin tools** — promote users to admin, list users

---

## Project Structure

```
slackline/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app, CORS, router registration, startup migrations
│   │   ├── config.py               # Pydantic settings
│   │   ├── database.py             # SQLAlchemy async engine + session
│   │   ├── dependencies.py         # get_current_user, get_current_admin
│   │   ├── models/
│   │   │   ├── user.py             # User, OAuthAccount
│   │   │   ├── slackline.py        # Slackline, Point, Component
│   │   │   ├── crossing.py         # Crossing
│   │   │   └── history.py          # ChangeHistory
│   │   ├── schemas/
│   │   │   ├── slackline.py
│   │   │   ├── crossing.py
│   │   │   ├── user.py
│   │   │   └── history.py
│   │   ├── routers/
│   │   │   ├── auth.py             # Google OAuth login / callback / logout / me
│   │   │   ├── slacklines.py       # Slackline CRUD + filter-options
│   │   │   ├── crossings.py        # Crossing CRUD + image upload
│   │   │   ├── history.py          # Change history
│   │   │   ├── statistics.py       # Per-slackline statistics
│   │   │   ├── diary.py            # Personal diary + diary stats
│   │   │   └── import_data.py      # CSV import, admin endpoints
│   │   ├── services/
│   │   │   ├── slackline_service.py
│   │   │   ├── crossing_service.py
│   │   │   ├── history_service.py
│   │   │   └── import_service.py
│   │   └── utils/
│   │       └── image_upload.py     # Local filesystem image storage
│   ├── alembic/                    # DB migrations
│   ├── create_admin.py             # CLI: promote user to admin
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts           # Axios instance (withCredentials)
│   │   │   └── hooks.ts            # All TanStack Query hooks
│   │   ├── components/
│   │   │   ├── Auth/LoginButton.tsx
│   │   │   ├── Map/LeafletMap.tsx
│   │   │   ├── SlacklineTable/
│   │   │   │   ├── SlacklineTable.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── DiaryTable.tsx
│   │   │   │   └── DiaryStatsPanel.tsx
│   │   │   ├── SlacklineDetail/
│   │   │   │   ├── InfoTab.tsx
│   │   │   │   ├── CrossingsTab.tsx
│   │   │   │   ├── PhotosTab.tsx
│   │   │   │   ├── HistoryTab.tsx
│   │   │   │   └── StatisticsTab.tsx
│   │   │   ├── CrossingForm/CrossingForm.tsx
│   │   │   └── SlacklineForm/SlacklineForm.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Map + Slacklines/Diary tabs
│   │   │   ├── SlacklineDetailPage.tsx
│   │   │   └── AuthCallbackPage.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts        # user, hydrate(), logout()
│   │   │   ├── mapStore.ts         # map bounds
│   │   │   └── filterStore.ts      # search, state, region, sector, minRating
│   │   └── types/index.ts          # All TypeScript interfaces
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── data/                           # CSV files for import
├── docker-compose.yml              # Development
├── docker-compose.prod.yml         # Production
├── render.yaml                     # Render.com deployment config
└── IMPLEMENTATION_PLAN.md          # Detailed implementation reference
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- A Google Cloud project with OAuth 2.0 credentials

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add these **Authorized redirect URIs**:
   ```
   http://localhost:8000/api/v1/auth/callback/google
   ```
4. Copy the **Client ID** and **Client Secret**

### 2. Environment Setup

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```dotenv
OAUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
SECRET_KEY=change-this-to-a-random-32-char-string
IMPORT_SECRET=importme
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### 3. Start

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### 4. Import CSV Data (optional)

```bash
curl -X POST http://localhost:8000/api/v1/admin/import \
  -H "X-Import-Secret: importme"
```

### 5. Create Your Admin Account

```bash
# First, log in normally via Google at http://localhost:3000
# Then promote your account:
curl -X POST http://localhost:8000/api/v1/admin/make-admin \
  -H "X-Import-Secret: importme" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@gmail.com"}'
# Log out and back in
```

---

## API Reference

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/auth/login/google` | — | Redirect to Google OAuth |
| GET | `/api/v1/auth/callback/google` | — | OAuth callback, sets cookie |
| GET | `/api/v1/auth/me` | Cookie | Current user info |
| POST | `/api/v1/auth/logout` | Cookie | Clear session |

### Slacklines
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/slacklines` | — | List (paginated, filterable, sortable) |
| GET | `/api/v1/slacklines/filter-options` | — | Cascading State/Region/Sector values |
| GET | `/api/v1/slacklines/{id}` | — | Full detail |
| POST | `/api/v1/slacklines` | Required | Create (multipart: JSON + cover image) |
| PATCH | `/api/v1/slacklines/{id}` | Creator/Admin | Edit |
| DELETE | `/api/v1/slacklines/{id}` | Creator/Admin | Delete |

### Crossings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/slacklines/{id}/crossings` | — | List crossings |
| POST | `/api/v1/slacklines/{id}/crossings` | Required | Add crossing (+ optional image) |
| PATCH | `/api/v1/slacklines/{id}/crossings/{cid}` | Creator/Admin | Edit crossing |
| DELETE | `/api/v1/slacklines/{id}/crossings/{cid}` | Creator/Admin | Delete crossing |

### History & Statistics
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/slacklines/{id}/history` | — | Change history (paginated) |
| GET | `/api/v1/slacklines/{id}/statistics` | — | Crossing stats |

### Diary (personal, requires login)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/diary` | Required | Your crossed lines with last date + count |
| GET | `/api/v1/diary/stats` | Required | Your personal aggregate statistics |

### Admin (require `X-Import-Secret` header)
| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/admin/import` | Import all CSV data |
| POST | `/api/v1/admin/make-admin` | Promote user: `{"email": "..."}` |
| GET | `/api/v1/admin/users` | List all users |

### Health
| Method | Path |
|---|---|
| GET | `/api/v1/health` |

---

## Slackline List — Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `page` | int | Page number (default 1) |
| `page_size` | int | Rows per page: 25 / 50 / 75 / 100 |
| `sort_by` | string | Column to sort by |
| `sort_dir` | `asc` / `desc` | Sort direction |
| `search` | string | Free-text search on name |
| `state` | string | Filter by state |
| `region` | string | Filter by region |
| `sector` | string | Filter by sector |
| `min_rating` | int | Minimum rating (1–5) |
| `bounds` | string | Map viewport: `sw_lat,sw_lon,ne_lat,ne_lon` |

---

## Diary Stats — Response Shape

```json
{
  "total_lines": 12,
  "total_crossings": 41,
  "style_distribution": [
    { "style": "OS (on sight)", "count": 19 },
    { "style": "AF (after fall)", "count": 15 },
    { "style": "OW (one way)",   "count": 4  },
    { "style": "Flash",          "count": 0  },
    { "style": "Redpoint",       "count": 0  },
    { "style": "Unknown",        "count": 3  }
  ],
  "length_distribution": [ { "bucket": "<20 m", "count": 2 }, "..." ],
  "height_distribution": [ { "bucket": "<2 m",  "count": 1 }, "..." ],
  "most_crossed": [
    { "id": 7, "name": "Slackline X", "crossing_count": 8 }
  ]
}
```

All 6 styles are always returned (with `count: 0` for unused ones). `most_crossed` only shows lines with `crossing_count > 1`.

---

## Crossing Styles

| Value | Meaning |
|---|---|
| `OS (on sight)` | On sight |
| `AF (after fall)` | After fall |
| `OW (one way)` | One way |
| `Flash` | Flash |
| `Redpoint` | Redpoint |

---

## Permissions

| Action | Who |
|---|---|
| View slacklines & crossings | Everyone (public) |
| Add a crossing | Any logged-in user |
| Create a slackline | Any logged-in user |
| Edit / delete own slackline | Creator or admin |
| Edit / delete own crossing | Creator or admin |
| Admin endpoints | Users with `is_admin = true` |

---

## Production Deployment

### Docker Compose (self-hosted)

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Set production environment variables (real domain, secure `SECRET_KEY`, production Google OAuth redirect URI).

### Render.com

The `render.yaml` file defines:
1. **`slackline-db`** — managed PostgreSQL
2. **`slackline-backend`** — Docker Web Service with persistent disk at `/app/uploads`
3. **`slackline-frontend`** — Static site (`npm run build`, publish `dist/`)

Update `BACKEND_URL` and `FRONTEND_URL` to your Render domain. Register the production redirect URI in Google Cloud Console.

---

## Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `OAUTH_GOOGLE_CLIENT_ID` | — | ✅ | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | — | ✅ | Google OAuth client secret |
| `SECRET_KEY` | `devsecretkey-...` | ✅ prod | JWT signing key |
| `BACKEND_URL` | `http://localhost:8000` | ✅ | Must match Google redirect URI |
| `FRONTEND_URL` | `http://localhost:3000` | ✅ | Post-login redirect target |
| `DATABASE_URL` | `postgresql+asyncpg://slackline:slackline@db/slackline` | ✅ | PostgreSQL connection string |
| `IMPORT_SECRET` | `importme` | — | Protects admin endpoints |
| `UPLOAD_DIR` | `/app/uploads` | — | Image storage path |
| `DATA_DIR` | `/app/data` | — | CSV import source path |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | — | CORS whitelist (comma-separated) |
| `JWT_EXPIRATION_HOURS` | `168` | — | Session lifetime (default 1 week) |

---

## Notes

- **Image storage** — images are stored on the local filesystem under `UPLOAD_DIR`. For production, mount a persistent volume.
- **Schema migrations** — the `cover_image_url` column is added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on startup, so no manual migration is needed after upgrading.
- **Recharts** — only `BarChart` is used. `PieChart` with custom SVG labels caused rendering crashes and was replaced.

