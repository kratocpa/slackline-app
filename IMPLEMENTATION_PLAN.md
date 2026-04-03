# Slackline Web Application – Implementation Plan

## Overview

A full-stack web application for managing and sharing rigged slackline data. Built with **FastAPI + SQLAlchemy** (backend), **PostgreSQL** (database), and **React + TypeScript** (frontend). Features include Google OAuth login, slackline CRUD, crossing tracking with image uploads, change history, statistics, an interactive OpenStreetMap view, a personal Diary, and a public Slackliners leaderboard. Containerised with Docker Compose, deployable to Render.com.

> **Status:** ✅ Fully implemented and running. This document reflects the exact built state, including all bug fixes and feature additions applied during development.

---

## 1. Monorepo Project Structure

```
slackline/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point + router registration + startup migrations
│   │   ├── config.py                # Settings via pydantic-settings
│   │   ├── database.py              # SQLAlchemy async engine + session factory
│   │   ├── dependencies.py          # get_current_user, get_current_admin, get_current_user_optional
│   │   ├── models/
│   │   │   ├── user.py              # User, OAuthAccount
│   │   │   ├── slackline.py         # Slackline, Point, Component
│   │   │   ├── crossing.py          # Crossing
│   │   │   └── history.py           # ChangeHistory
│   │   ├── schemas/
│   │   │   ├── slackline.py         # PointCreate/Response, SlacklineCreate/Update/Detail/ListItem/ListResponse
│   │   │   ├── crossing.py          # CrossingCreate/Update/Item/ListResponse, StatisticsResponse
│   │   │   ├── user.py              # UserResponse, UserBrief
│   │   │   └── history.py           # ChangeHistoryItem, ChangeHistoryResponse
│   │   ├── routers/
│   │   │   ├── auth.py              # /api/v1/auth — Google OAuth only
│   │   │   ├── slacklines.py        # /api/v1/slacklines — CRUD + filter-options
│   │   │   ├── crossings.py         # /api/v1/slacklines/{id}/crossings — CRUD
│   │   │   ├── history.py           # /api/v1/slacklines/{id}/history
│   │   │   ├── statistics.py        # /api/v1/slacklines/{id}/statistics
│   │   │   ├── diary.py             # /api/v1/diary — personal diary + stats
│   │   │   ├── slackliners.py       # /api/v1/slackliners — public user stats + lines
│   │   │   └── import_data.py       # /api/v1/admin/import, /admin/make-admin, /admin/users
│   │   ├── services/
│   │   │   ├── slackline_service.py
│   │   │   ├── crossing_service.py
│   │   │   ├── history_service.py
│   │   │   └── import_service.py
│   │   └── utils/
│   │       └── image_upload.py      # local filesystem image storage
│   ├── alembic/                     # DB migrations
│   │   ├── env.py
│   │   └── versions/
│   ├── create_admin.py              # CLI script: python create_admin.py <email>
│   ├── tests/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts            # axios instance, baseURL + withCredentials
│   │   │   └── hooks.ts             # all TanStack Query hooks
│   │   ├── components/
│   │   │   ├── Auth/LoginButton.tsx
│   │   │   ├── Map/LeafletMap.tsx
│   │   │   ├── SlacklineTable/
│   │   │   │   ├── SlacklineTable.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── DiaryTable.tsx           # diary lines tab
│   │   │   │   ├── DiaryStatsPanel.tsx      # thin wrapper → UserStatsPanel
│   │   │   │   ├── UserStatsPanel.tsx       # reusable stats panel (diary + slackliners)
│   │   │   │   └── SlacklinersTable.tsx     # slackliners tab: list + user detail
│   │   │   ├── SlacklineDetail/
│   │   │   │   ├── InfoTab.tsx
│   │   │   │   ├── CrossingsTab.tsx
│   │   │   │   ├── PhotosTab.tsx
│   │   │   │   ├── HistoryTab.tsx
│   │   │   │   └── StatisticsTab.tsx
│   │   │   ├── CrossingForm/CrossingForm.tsx
│   │   │   └── SlacklineForm/SlacklineForm.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx             # map + tabs (Slacklines | Diary | Slackliners)
│   │   │   ├── SlacklineDetailPage.tsx
│   │   │   └── AuthCallbackPage.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts         # user, isLoading, hydrate(), logout()
│   │   │   ├── mapStore.ts          # bounds, setBounds()
│   │   │   └── filterStore.ts       # search, state, region, sector, minRating
│   │   ├── types/index.ts           # all TypeScript interfaces
│   │   ├── App.tsx                  # Routes + global ErrorBoundary
│   │   └── main.tsx
│   ├── Dockerfile                   # multi-stage: dev target + prod nginx target
│   ├── nginx.conf                   # SPA routing + /api proxy to backend
│   ├── package.json
│   ├── vite.config.ts               # dev proxy: /api → http://backend:8000
│   └── tsconfig.json
├── data/                            # original CSV exports
├── docker-compose.yml               # development (hot-reload, volume mounts)
├── docker-compose.prod.yml          # production (gunicorn, nginx)
├── render.yaml                      # Render.com infrastructure-as-code
├── README.md
├── AGENT.md
└── IMPLEMENTATION_PLAN.md
```

---

## 2. Database Schema

### 2.1 `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR UNIQUE NOT NULL | |
| username | VARCHAR UNIQUE NOT NULL | derived from email on first login |
| display_name | VARCHAR | from Google profile |
| avatar_url | VARCHAR | from Google profile |
| is_active | BOOLEAN DEFAULT true | |
| is_admin | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### 2.2 `oauth_accounts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| provider | VARCHAR | `google` only |
| provider_user_id | VARCHAR | Google `sub` |
| access_token | TEXT | |
| expires_at | TIMESTAMPTZ | |

**Index:** `(provider, provider_user_id)` UNIQUE

### 2.3 `points`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| description | TEXT | nullable |
| latitude | NUMERIC(10,7) NOT NULL | |
| longitude | NUMERIC(10,7) NOT NULL | |

### 2.4 `slacklines`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| name | VARCHAR NOT NULL | |
| description | TEXT | |
| state | VARCHAR | country/state |
| region | VARCHAR | |
| sector | VARCHAR | |
| length | NUMERIC(8,2) | metres |
| height | NUMERIC(8,2) | metres |
| author | VARCHAR | |
| name_history | TEXT | |
| date_tense | DATE | labelled "First Rigged" in UI |
| time_approach | VARCHAR | |
| time_tensioning | VARCHAR | labelled "Rigging Time" in UI |
| rating | INTEGER | 1–5 |
| cover_image_url | VARCHAR(512) | hero photo |
| restriction | TEXT | access restrictions/conditions; added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on startup |
| type | VARCHAR(50) | `highline`, `midline`, `waterline`, `longline`; added via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` on startup; auto-populated: `highline` if height > 10, `midline` if height ≤ 10 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| created_by_id | UUID FK → users NULLABLE | |
| updated_by_id | UUID FK → users NULLABLE | |

> `date_insertion` column still exists in the DB (from original import) but is no longer exposed in the API or UI.

**Indexes:** `state`, `region`, `sector`, `rating`

### 2.5 `components`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| slackline_id | INTEGER FK → slacklines | |
| point_id | INTEGER FK → points | |
| component_type | VARCHAR | `first_anchor_point`, `second_anchor_point`, `parking_spot` |
| field | VARCHAR | raw CSV field value |
| order | INTEGER | |

**Index:** `(slackline_id, component_type)`

### 2.6 `crossings`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK autoincrement | |
| slackline_id | INTEGER FK → slacklines | |
| user_id | UUID FK → users NULLABLE | |
| date | DATE | field named `date` — use `DateType` alias in schemas |
| style | VARCHAR | `OS (on sight)`, `AF (after fall)`, `OW (one way)`, `Flash`, `Redpoint`, or empty string |
| accent_description | TEXT | |
| rating | INTEGER | 1–5 |
| image_url | VARCHAR | `/uploads/…` |
| project | BOOLEAN | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:** `(slackline_id)`, `(user_id)`

### 2.7 `change_history`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| entity_type | VARCHAR | `slackline` |
| entity_id | INTEGER | |
| user_id | UUID FK → users | |
| changed_at | TIMESTAMPTZ | |
| changes | JSONB | `{field: {old, new}}` |

---

## 3. Backend API

Base path: `/api/v1`

### 3.1 Authentication
| Method | Path | Description |
|---|---|---|
| GET | `/auth/login/google` | Redirect to Google OAuth consent |
| GET | `/auth/callback/google` | OAuth callback — set httpOnly JWT cookie, redirect to frontend |
| GET | `/auth/me` | Current user (null if not logged in) |
| POST | `/auth/logout` | Clear JWT cookie |

JWT issued as httpOnly `samesite=lax` cookie. `get_current_user` dependency validates it.

**Critical:** Redirect URI must always be built from `settings.BACKEND_URL`, not from `request.url_for()`. Register `{BACKEND_URL}/api/v1/auth/callback/google` exactly in Google Cloud Console.

### 3.2 Slacklines
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/slacklines` | public | Paginated; params: `page`, `page_size`, `sort_by`, `sort_dir`, `search`, `state`, `region`, `sector`, `min_rating`, `bounds` (bbox `sw_lat,sw_lon,ne_lat,ne_lon`) |
| GET | `/slacklines/filter-options` | public | Returns `{states, regions, sectors}`; regions filtered by state param; sectors filtered by state+region |
| GET | `/slacklines/{id}` | public | Full detail with resolved anchor/parking points. Includes `restriction` and `type`; does NOT include `date_insertion`. |
| POST | `/slacklines` | required | `multipart/form-data`: `data` (JSON string) + optional `cover_image` file |
| PATCH | `/slacklines/{id}` | creator or admin | Same multipart format |
| DELETE | `/slacklines/{id}` | creator or admin | |

**SlacklineCreate/Update fields:** `name`, `description`, `state`, `region`, `sector`, `length`, `height`, `author`, `name_history`, `date_tense`, `time_approach`, `time_tensioning`, `rating`, `restriction`, `type`, `first_anchor_point`, `second_anchor_point`, `parking_spot`

### 3.3 Crossings
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/slacklines/{id}/crossings` | public | Paginated; sortable |
| POST | `/slacklines/{id}/crossings` | required | `multipart/form-data`: `date`, `style`, `accent_description`, `rating`, `project`, optional `image` |
| PATCH | `/slacklines/{id}/crossings/{cid}` | creator or admin | JSON body |
| DELETE | `/slacklines/{id}/crossings/{cid}` | creator or admin | |

### 3.4 History & Statistics
| Method | Path | Description |
|---|---|---|
| GET | `/slacklines/{id}/history` | Paginated change history |
| GET | `/slacklines/{id}/statistics` | `{total_crossings, style_distribution, top_users, average_rating}` |

### 3.5 Diary (authenticated)
| Method | Path | Description |
|---|---|---|
| GET | `/diary` | Slacklines crossed by current user; paginated; items include `last_crossing_date`, `crossing_count`; sortable by `last_crossing_date`, `crossing_count`, `name`, `state`, `region`, `length`, `height`, `rating` |
| GET | `/diary/stats` | Aggregate statistics for current user |

**`/diary/stats` response shape** — see section 3.6 below (identical structure).

### 3.6 Slackliners (public)
| Method | Path | Description |
|---|---|---|
| GET | `/slackliners` | All registered users with crossing summary stats |
| GET | `/slackliners/{user_id}/info` | Basic user info (id, username, display_name, avatar_url) |
| GET | `/slackliners/{user_id}/lines` | Slacklines crossed by that user; paginated + sortable; same shape as `/diary` |
| GET | `/slackliners/{user_id}/stats` | Detailed crossing stats; same shape as `/diary/stats` |

**`/slackliners` response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "username": "jdoe",
      "display_name": "John Doe",
      "avatar_url": "https://...",
      "crossed_lines": 24,
      "crossed_lines_last_30d": 3,
      "longest_crossed": 420.0,
      "highest_crossed": 85.0
    }
  ],
  "total": 1
}
```

**Stats response (both `/diary/stats` and `/slackliners/{id}/stats`):**
```json
{
  "total_lines": 12,
  "total_crossings": 41,
  "style_distribution": [
    { "style": "OS (on sight)", "count": 19 },
    { "style": "AF (after fall)", "count": 15 },
    { "style": "OW (one way)", "count": 4 },
    { "style": "Flash", "count": 0 },
    { "style": "Redpoint", "count": 0 },
    { "style": "Unknown", "count": 3 }
  ],
  "length_distribution": [{ "bucket": "<20 m", "count": 2 }],
  "height_distribution": [{ "bucket": "<2 m", "count": 1 }],
  "most_crossed": [{ "id": 7, "name": "Slackline X", "crossing_count": 8 }]
}
```

**Style distribution** always includes all 6 known styles with 0 for unused ones. Empty string styles treated as `Unknown` via `COALESCE(NULLIF(style, ''), 'Unknown')`.

**Length buckets (9):** `<20 m` · `20–50 m` · `50–100 m` · `100–150 m` · `150–200 m` · `200–300 m` · `300–500 m` · `500–1000 m` · `>1000 m` · `Unknown`

**Height buckets (8):** `<2 m` · `2–5 m` · `5–10 m` · `10–20 m` · `20–30 m` · `30–50 m` · `50–80 m` · `>80 m` · `Unknown`

**Most crossed:** top 10 by crossing count; frontend filters to show only `crossing_count > 1`.

**SQL implementation note:** All `CASE` expressions must be computed in a subquery first, then `GROUP BY` the named column in the outer query — PostgreSQL rejects `GROUP BY case_expression` when referenced by alias in the same query.

### 3.7 Admin
All protected by `X-Import-Secret` header.

| Method | Path | Description |
|---|---|---|
| POST | `/admin/import` | Upsert all CSV data; idempotent |
| POST | `/admin/make-admin` | `{"email": "..."}` |
| GET | `/admin/users` | List all users |

### 3.8 Health
`GET /health` → `{"status": "ok"}`

---

## 4. Backend Implementation Details

### 4.1 `main.py` — Router Registration Order & Startup Migrations
```python
app.include_router(auth.router,        prefix="/api/v1")
app.include_router(slacklines.router,  prefix="/api/v1")
app.include_router(crossings.router,   prefix="/api/v1")
app.include_router(history.router,     prefix="/api/v1")
app.include_router(statistics.router,  prefix="/api/v1")
app.include_router(import_data.router, prefix="/api/v1")
app.include_router(diary.router,       prefix="/api/v1")
app.include_router(slackliners.router, prefix="/api/v1")
```

On startup, idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` migrations run for:
- `cover_image_url VARCHAR(512)` on `slacklines`
- `restriction TEXT` on `slacklines`
- `type VARCHAR(50)` on `slacklines`

After adding `type`, auto-populate for existing rows:
```sql
UPDATE slacklines SET type = 'highline' WHERE height IS NOT NULL AND height > 10 AND type IS NULL;
UPDATE slacklines SET type = 'midline'  WHERE height IS NOT NULL AND height <= 10 AND type IS NULL;
```

### 4.2 `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY pyproject.toml .
COPY app/ app/
RUN pip install --no-cache-dir .
COPY alembic/ alembic/
COPY alembic.ini .
RUN mkdir -p /app/uploads
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> **No LaTeX/PDF packages.** PDF generation was deliberately removed from the application.

### 4.3 `backend/pyproject.toml` — Required Section
```toml
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]
```
Without `[tool.setuptools.packages.find]`, `pip install .` fails with "no packages found".

### 4.4 Schema Type Annotation Rules
- Always use `from typing import Optional` + `Optional[X]`, never `X | None`
- In any schema/model where a field is named `date`: `from datetime import date as DateType`; use `Optional[DateType]` in annotations
- Never use `from __future__ import annotations` in Pydantic schema files

### 4.5 `diary.py` / `slackliners.py` — Key SQL Patterns

**Per-user stats subquery:**
```python
stats_sq = (
    select(
        Crossing.slackline_id,
        func.max(Crossing.date).label("last_date"),
        func.count(Crossing.id).label("cnt"),
    )
    .where(Crossing.user_id == user_id)
    .group_by(Crossing.slackline_id)
    .subquery()
)
```

**Bucketing with CASE (must use subquery):**
```python
length_case = case(
    (Slackline.length == None, "Unknown"),
    (Slackline.length < 20, "<20 m"),
    ...
)
length_inner = (
    select(Crossing.slackline_id, length_case.label("bucket"))
    .join(Slackline, Crossing.slackline_id == Slackline.id)
    .where(Crossing.user_id == user_id)
    .distinct()
    .subquery()
)
length_q = select(length_inner.c.bucket, func.count().label("cnt")).group_by(length_inner.c.bucket)
```

**Style with empty-string handling:**
```python
style_inner = (
    select(func.coalesce(func.nullif(Crossing.style, ""), "Unknown").label("style"))
    .where(Crossing.user_id == user_id)
    .subquery()
)
```

The `build_user_stats(db, user_id)` helper in `slackliners.py` implements all the same logic as `/diary/stats` but accepts any `user_id` UUID (not just the current user). Both `/diary/stats` and `/slackliners/{id}/stats` return the identical response shape.

---

## 5. Frontend Architecture

### 5.1 Libraries
| Library | Purpose |
|---|---|
| React 18 + TypeScript + Vite | Core |
| React Router v6 | SPA routing |
| TanStack Query v5 | Server state, caching, pagination |
| Zustand | Client state (auth, map bounds, filters) |
| React-Leaflet + Leaflet | OpenStreetMap |
| Axios | HTTP (`withCredentials: true`) |
| Tailwind CSS | Styling |
| Recharts | Charts — **BarChart only** (PieChart causes SVG rendering crashes) |
| react-dropzone | Image upload |

### 5.2 Pages & Routes
```
/                         → HomePage
/slacklines/:id           → SlacklineDetailPage
/auth/callback/:provider  → AuthCallbackPage
```

### 5.3 `types/index.ts` — All Interfaces
```typescript
PointResponse              { id, description?, latitude, longitude }
SlacklineListItem          { id, name, state?, region?, length?, height?,
                             rating?, date_tense?, first_anchor?, second_anchor? }
SlacklineListResponse      { items, total, page, page_size, pages }
SlacklineDetail            { id, name, description?, state?, region?, sector?,
                             length?, height?, author?, name_history?, date_tense?,
                             time_approach?, time_tensioning?,
                             rating?, cover_image_url?,
                             restriction?, type?,
                             created_at?, updated_at?,
                             created_by_id?, updated_by_id?,
                             first_anchor_point?, second_anchor_point?, parking_spot? }
                             // note: date_insertion is NOT included
UserBrief                  { id, username, avatar_url? }
UserResponse               extends UserBrief { email, display_name?, is_active, is_admin }
CrossingItem               { id, slackline_id, date?, style?, accent_description?,
                             rating?, image_url?, project?, user?, created_at? }
CrossingListResponse       { items, total, page, page_size, pages }
ChangeHistoryItem          { id, entity_type, entity_id, user?, changed_at, changes }
ChangeHistoryResponse      { items, total, page, page_size, pages }
StatisticsResponse         { total_crossings, style_distribution, top_users, average_rating? }
DiaryItem                  { id, name, state?, region?, length?, height?, rating?,
                             last_crossing_date?, crossing_count,
                             first_anchor?, second_anchor? }
DiaryResponse              { items, total, page, page_size, pages }
DiaryStatsResponse         { total_lines, total_crossings, style_distribution,
                             length_distribution, height_distribution, most_crossed }
SlacklinerItem             { id, username, display_name?, avatar_url?,
                             crossed_lines, crossed_lines_last_30d,
                             longest_crossed?, highest_crossed? }
SlacklinerListResponse     { items, total }
SlacklinerLineItem         { id, name, state?, region?, length?, height?, rating?,
                             last_crossing_date?, crossing_count,
                             first_anchor?, second_anchor? }
SlacklinerLinesResponse    { items, total, page, page_size, pages }
SlacklinerUserInfo         { id, username, display_name?, avatar_url? }
```

### 5.4 `api/hooks.ts` — All Hooks
```typescript
useSlacklines(params)                              → SlacklineListResponse
useFilterOptions(state?, region?)                  → { states, regions, sectors }
useSlacklineDetail(id)                             → SlacklineDetail
useCrossings(slacklineId, params)                  → CrossingListResponse
useHistory(slacklineId, params)                    → ChangeHistoryResponse
useStatistics(slacklineId)                         → StatisticsResponse
useCreateSlackline()                               → mutation (FormData)
useUpdateSlackline(id)                             → mutation (FormData)
useCreateCrossing(slacklineId)                     → mutation (FormData) — invalidates crossings, statistics, diary
useDeleteCrossing(slacklineId)                     → mutation (crossingId: number) — invalidates crossings, statistics, diary
useDiary(params, enabled)                          → DiaryResponse
useDiaryStats(enabled)                             → DiaryStatsResponse
useSlackliners()                                   → SlacklinerListResponse
useSlacklinerInfo(userId, enabled)                 → SlacklinerUserInfo
useSlacklinerLines(userId, params, enabled)        → SlacklinerLinesResponse
useSlacklinerStats(userId, enabled)                → DiaryStatsResponse
```

### 5.5 `LeafletMap` — Generic `MapItem` Interface
```typescript
export interface MapItem {
  id: number; name: string;
  length?: number | null; height?: number | null; rating?: number | null;
  first_anchor?: PointResponse | null;
}
```
`SlacklineListItem`, `DiaryItem`, and `SlacklinerLineItem` all satisfy this interface — no casting needed when switching map data between tabs.

### 5.6 `HomePage`
- **Three main tabs:** `Slacklines`, `📓 Diary` (logged-in only), `👥 Slackliners`
- Switching to Slacklines or Diary tabs resets `selectedSlacklinerUserId` to `null`

#### Map behaviour per tab
| Tab state | Map shows |
|---|---|
| Slacklines tab | All slacklines (with current filters applied) |
| Diary tab | Only lines the current user has crossed |
| Slackliners tab, no user selected | All slacklines |
| Slackliners tab, user selected | Only lines that selected user has crossed |

Map data is fetched with `page_size=1000`. For the slackliners tab, `useSlacklinerLines(selectedUserId, {page:1, page_size:1000}, enabled)` is used.

#### FilterBar (cascading listboxes)
- **State** → all distinct states from DB
- **Region** → distinct regions for selected state (only populated after state is chosen)
- **Sector** → distinct sectors for selected state+region
- Fetched from `GET /slacklines/filter-options?state=X&region=Y`
- **Min Rating** number input, **Search** free-text

#### SlacklineTable columns
`Name` | `State` | `Region` | `Length (m)` | `Height (m)` | `Rating` | `First Rigged`

Sortable by clicking headers. Page size picker: **25 / 50 / 75 / 100** (default 25). Smart page window: current page ± 3 with `…` for gaps and always shows page 1 and last page.

#### DiaryTable columns
`Name` | `State` | `Region` | `Length (m)` | `Height (m)` | `Rating` | `Last Crossed` | `Crossings`

Same pagination UI. Default sort: `last_crossing_date` descending.

### 5.7 `SlacklineDetailPage`
- **Header:** circular back button (← arrow SVG, `navigate(-1)`) + slackline name + Edit button (creator/admin only)
- **Mini map:** anchor 1, anchor 2, red polyline between them, parking spot marker
- **Tab bar:** `Information` | `Crossings` | `Photos` | `History` | `Statistics`
- No PDF button (PDF generation was removed)

#### InfoTab
- **Hero section:** if `cover_image_url` — image displayed with `object-contain` (no distortion/black bars) in fixed-height container; name + stats overlaid. If no image — gradient header.
- **Quick-stat pills:** length (horizontal narrow icon), height (vertical narrow icon), location, author
- **Description** in left-bordered blockquote
- **Details grid (labels):**
  - `Time Approach` (was: Time Approach — unchanged)
  - `Rigging Time` (was: `time_tensioning` field, previously labelled "Time Tensioning")
  - `First Rigged` (was: `date_tense` field, previously labelled "Date Tense")
  - `Type` (new field)
  - `Restriction` (new field)
  - `Name History`
  - ~~`Date Insertion`~~ — **removed from UI**
- **Anchor Points & Parking:** each as a card with 3 sub-fields: **Latitude / Longitude / Description**
- **Meta footer:** created/updated timestamps

#### CrossingsTab
- Table: `Date` | `User` (avatar + name) | `Style` | `Rating` | `Notes` | *(delete column)*
- **Delete button:** trash-can SVG icon, visible only to crossing creator or admin; `confirm()` before delete
- "Add Crossing" button (no photo upload in this tab) opens `<CrossingForm showImageUpload={false}>`

#### PhotosTab
- Grid of crossing photos; click opens lightbox

#### HistoryTab / StatisticsTab
- Unchanged from initial implementation

### 5.8 `SlacklineForm`
Fields in 2-column grid:
- Name*, Author, State, Region, Sector, Length (m), Height (m), Rating
- **Time Approach**, **Rigging Time** (time_tensioning), **First Rigged** (date, type=date input), **Type** (select: highline/midline/waterline/longline)
- Description (textarea), **Restriction** (textarea — new), Name History (textarea)
- Anchor Point 1 (lat/lon/desc), Anchor Point 2 (lat/lon/desc), Parking Spot (lat/lon/desc)
- Cover photo dropzone

### 5.9 `UserStatsPanel` (reusable)
Accepts `data: DiaryStatsResponse`. Used by both `DiaryStatsPanel` and `SlacklinersTable` user detail view.

- **Summary cards:** Lines Crossed + Total Crossings (slate background, no colour)
- **Crossings by Style:** BarChart with soft multi-color palette (10 muted colours — soft blue, muted teal, dusty violet, warm sand, sage green, dusty rose, sky teal, warm olive, periwinkle, caramel)
- **Lines by Length:** BarChart, 9 granular buckets, angled X-axis labels
- **Lines by Height:** BarChart, 8 granular buckets
- **Most Visited Lines:** only shows lines with `crossing_count > 1`; clickable → navigate to detail
- All charts wrapped in `ChartErrorBoundary`

**Chart colour palette:**
```typescript
const PALETTE = [
  '#6ea8d8', '#76b8a8', '#a08ec8', '#e89a6a', '#7cc48a',
  '#c87a8a', '#6ab8c8', '#b8a86a', '#8898d8', '#c8a878',
];
```

### 5.10 `DiaryStatsPanel`
Thin wrapper around `<UserStatsPanel>` — fetches `useDiaryStats()` then delegates rendering.

### 5.11 `SlacklinersTable`
Three components in one file:

**`SlacklinersTable` (main list, `onUserSelect` prop):**
| Column | Notes |
|---|---|
| User | avatar + display name + @username |
| Lines Crossed | total distinct lines |
| Last 30 days | lines crossed in last 30 days |
| Longest (m) | max length of any crossed line |
| Highest (m) | max height of any crossed line |
Click row → `setSelectedUserId`, call `onUserSelect(userId)` (for map update in parent)

**`SlacklinerDetail` (user detail view):**
- Header: back button + avatar + name/@username
- Two sub-tabs: **Lines** (→ `LinesTab`) and **Statistics** (→ `UserStatsPanel`)

**`LinesTab`:**
- Same sortable paginated table as `DiaryTable`
- Clicking a row navigates to slackline detail page

### 5.12 `App.tsx`
- Global `ErrorBoundary` wraps all routes
- `useEffect(() => hydrate())` on mount to restore auth state from backend cookie

---

## 6. Docker / Deployment

### 6.1 `docker-compose.yml` (development)
```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: slackline, POSTGRES_USER: slackline, POSTGRES_PASSWORD: slackline }
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U slackline"], interval: 5s, timeout: 5s, retries: 5 }

  backend:
    build: ./backend
    depends_on: { db: { condition: service_healthy } }
    env_file: ./backend/.env
    environment:
      DATABASE_URL: postgresql+asyncpg://slackline:slackline@db/slackline
      BACKEND_URL: http://localhost:8000
      FRONTEND_URL: http://localhost:3000
      UPLOAD_DIR: /app/uploads
      ALLOWED_ORIGINS: http://localhost:3000
      DATA_DIR: /app/data
    volumes:
      - ./backend/app:/app/app      # hot-reload via uvicorn --reload
      - ./data:/app/data
      - uploads:/app/uploads
    ports: ["8000:8000"]
    command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: { context: ./frontend, target: dev }
    depends_on: [backend]
    ports: ["3000:3000"]
    volumes: [./frontend/src:/app/src, ./frontend/index.html:/app/index.html]
    environment: { VITE_API_BASE_URL: http://localhost:8000 }

volumes: { pgdata:, uploads: }
```

### 6.2 `backend/.env`
```dotenv
OAUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
SECRET_KEY=change-this-random-32-char-string
IMPORT_SECRET=importme
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

### 6.3 Production (`docker-compose.prod.yml`)
- Backend: gunicorn with UvicornWorker
- Frontend: nginx serves static build, proxies `/api` → `backend:8000`
- No dev port exposure, `restart: unless-stopped`

### 6.4 `render.yaml`
1. `slackline-db` — managed PostgreSQL
2. `slackline-backend` — Docker Web Service, persistent disk at `/app/uploads`
3. `slackline-frontend` — Static site, `npm run build`, publish `dist/`

---

## 7. Data Import Pipeline

### 7.1 CSV Files → Tables
| CSV File | Target |
|---|---|
| `components_point_anchor_points_*.csv` | `points` |
| `slacklines_*.csv` | `slacklines` |
| `slacklines_components_*.csv` | `components` |
| `slackline_records_*.csv` | `crossings` |
| `slackline_records_slackline_links_*.csv` | `crossings.slackline_id` |

### 7.2 `component_type` Normalisation
| CSV `field` | DB `component_type` |
|---|---|
| `firstAnchorPoint` | `first_anchor_point` |
| `secondAnchorPoint` | `second_anchor_point` |
| `parkingSpot` | `parking_spot` |

### 7.3 Import Endpoint
`POST /api/v1/admin/import` with `X-Import-Secret` header. Idempotent upsert. Resets PostgreSQL sequences after import.

---

## 8. Admin Bootstrap

### Promote after first login (recommended)
```bash
# 1. Log in via Google at http://localhost:3000
# 2. Promote:
curl -X POST http://localhost:8000/api/v1/admin/make-admin \
  -H "X-Import-Secret: importme" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@gmail.com"}'
# 3. Log out and back in
```

### Pre-create via CLI
```bash
docker compose exec backend python create_admin.py your@gmail.com
```

---

## 9. Key Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://slackline:slackline@db/slackline` | PostgreSQL connection |
| `SECRET_KEY` | `devsecretkey-change-in-production` | JWT signing |
| `IMPORT_SECRET` | `importme` | Protects admin endpoints |
| `OAUTH_GOOGLE_CLIENT_ID` | — | **Required** |
| `OAUTH_GOOGLE_CLIENT_SECRET` | — | **Required** |
| `BACKEND_URL` | `http://localhost:8000` | Must match Google Console redirect URI exactly |
| `FRONTEND_URL` | `http://localhost:3000` | Post-login redirect |
| `UPLOAD_DIR` | `/app/uploads` | Image storage |
| `DATA_DIR` | `/app/data` | CSV import source |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS whitelist |
| `JWT_EXPIRATION_HOURS` | `168` | Cookie lifetime (1 week) |

---

## 10. Decisions & Constraints

1. **OAuth:** Google only. No other providers.
2. **Image storage:** Local filesystem (`UPLOAD_DIR`). No cloud storage.
3. **Visibility:** No draft/publish column. All slacklines are publicly visible once created.
4. **User registration:** Auto-created on first Google login. Username derived from email prefix, deduplicated with numeric suffix.
5. **Edit permissions:** Only `created_by` user or admins can edit/delete slacklines and crossings. Any logged-in user can add a crossing to any slackline.
6. **No PDF export:** PDF/LaTeX generation was implemented and deliberately removed. Do not re-add it.
7. **Charts:** Use `BarChart` only from Recharts. `PieChart` with custom label functions in SVG context causes React render errors caught by `ChartErrorBoundary`. Always wrap `ResponsiveContainer` in `<div style={{ width: '100%', height: Npx }}>` to guarantee non-zero pixel dimensions.
8. **Slackline `type` field:** Possible values are `highline`, `midline`, `waterline`, `longline`. Auto-populated from `height` column on DB startup for existing rows.
9. **`date_insertion` column:** Retained in the DB (from original CSV import) but deliberately hidden from all API responses and UI.

---

## 11. Known Issues Fixed During Development

### `ValidationError: Input should be None` on crossing date
**Cause:** `date` field in `CrossingCreate` schema shadowed Python's `date` type.
**Fix:** `from datetime import date as DateType`; use `Optional[DateType]` everywhere.

### `MissingGreenlet` on re-login
**Cause:** `oauth_account.user` triggered a lazy SQLAlchemy relationship load in async context.
**Fix:** Always load `User` explicitly in auth callback: `await db.execute(select(User).where(...))`. Set relationship to `lazy="raise"`.

### Recharts blank page / crash
**Cause:** Zero-height `ResponsiveContainer` or null/malformed data crashed React tree.
**Fix:** Global `ErrorBoundary` in `App.tsx`; `ChartErrorBoundary` per chart; always `<div style={{ width: '100%', height: Npx }}>` wrapper; filter all chart data with `?? []` before passing to Recharts.

### `Error 400: redirect_uri_mismatch`
**Cause:** Docker internal hostname in `request.url_for()` doesn't match the registered Google redirect URI.
**Fix:** Build redirect URI as `f"{settings.BACKEND_URL}/api/v1/auth/callback/google"`.

### `pip install .` fails — "no packages found"
**Cause:** `pyproject.toml` missing `[tool.setuptools.packages.find]`.
**Fix:**
```toml
[tool.setuptools.packages.find]
where = ["."]
include = ["app*"]
```

### PostgreSQL `GroupingError` with `CASE` in `GROUP BY`
**Cause:** SQLAlchemy passes `CASE` object to `GROUP BY`; PostgreSQL rejects grouping by alias in the same query level.
**Fix:** Compute `CASE` in an inner subquery (`.distinct().subquery()`), then `GROUP BY` the named column in the outer query.

### Style `''` (empty string) not mapped to `Unknown`
**Cause:** `COALESCE(style, 'Unknown')` only handles NULL; empty strings pass through.
**Fix:** `COALESCE(NULLIF(style, ''), 'Unknown')`. Also sanitize on frontend: `style?.trim() || 'Unknown'`.

### Cover image distortion / black bars
**Cause:** `object-cover` stretched portrait images; `object-fill` caused black bars.
**Fix:** `object-contain` with a neutral/dark background on the container.

---

## 12. Running Locally

```bash
# 1. Set up credentials
cp backend/.env.example backend/.env
# Edit backend/.env — set OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET

# 2. Google Cloud Console — add exactly:
#    Authorized JavaScript origins:  http://localhost:3000
#    Authorized redirect URIs:       http://localhost:8000/api/v1/auth/callback/google

# 3. Start
docker compose up --build

# 4. Import CSV data
curl -X POST http://localhost:8000/api/v1/admin/import -H "X-Import-Secret: importme"

# 5. Promote yourself to admin (after first Google login)
curl -X POST http://localhost:8000/api/v1/admin/make-admin \
  -H "X-Import-Secret: importme" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@gmail.com"}'

# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```
