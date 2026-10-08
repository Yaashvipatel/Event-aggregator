# Campus Event Aggregator

Real-time university event platform: one place for events, notices and RSVPs, with personalised
recommendations.

**Stack:** Node.js, Express 5, MongoDB (Mongoose), Socket.IO, JWT, bcrypt, Python, Flask, scikit-learn.

```
Browser (HTML/JS) --REST + WebSocket--> Node/Express + Socket.IO --Mongoose--> MongoDB
                                                |
                                                +--HTTP--> Flask recommender (TF-IDF + cosine similarity)
```

## Run it

Needs Node 18+, Python 3.9+, and a MongoDB (local, Atlas, or the built-in in-memory option below).

**Option A - one command** (installs everything on first run)

```bash
./start.sh          # macOS / Linux
start.bat           # Windows
```
Then open **http://localhost:3000**. Demo data is loaded automatically on first run.

**Option B - no MongoDB installed?** Use the throw-away in-memory database:

```bash
cd backend && npm install mongodb-memory-server
# in backend/.env set USE_MEMORY_DB=true, then run ./start.sh from the project root
```

**Option C - Docker:** `docker compose up --build` (starts MongoDB + recommender + app).

**Manual:** `cd backend && npm install && npm start`, and in another terminal
`cd recommender && pip install -r requirements.txt && python app.py`.

Configuration lives in `backend/.env` (`MONGO_URI`, `JWT_SECRET`, `RECOMMENDER_URL`, ...).
**Change `JWT_SECRET` before deploying.** If the recommender is not running, the app still works
and falls back to a simple keyword matcher.

### Demo accounts

| Student ID | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | admin |
| `org001`, `org002` | `Organizer@123` | organizer |
| `stu001`, `stu002` | `Student@123` | student |

`npm run seed` (in `backend/`) resets the database to this demo data.

## Roles

| | student | organizer | admin |
|---|---|---|---|
| Browse events/notices, RSVP, get recommendations | yes | yes | yes |
| Post events & notices | | yes | yes |
| Edit/delete own events & notices | | yes | any |
| List users, change roles | | | yes |

Sign-up always creates a student; an admin promotes users. Role changes apply instantly (the
user is loaded from the DB on every request) and the affected user is notified live.

## REST API (18 endpoints, all under `/api`, JWT `Authorization: Bearer <token>`)

| # | Method & path | Access |
|---|---|---|
| 1 | `POST /auth/register` | public |
| 2 | `POST /auth/login` | public |
| 3 | `GET /auth/me` | any user |
| 4 | `PUT /auth/me` (name, interests, password) | any user |
| 5 | `GET /events` (`search`, `category`, `filter=upcoming\|past\|all`, `page`, `limit`) | any user |
| 6 | `GET /events/:id` | any user |
| 7 | `POST /events` (multipart, up to 4 images) | organizer, admin |
| 8 | `PUT /events/:id` | owner organizer, admin |
| 9 | `DELETE /events/:id` | owner organizer, admin |
| 10 | `POST /events/:id/rsvp` (atomic, capacity-safe) | any user |
| 11 | `DELETE /events/:id/rsvp` | any user |
| 12 | `GET /events/me/rsvps` | any user |
| 13 | `GET /recommendations` | any user |
| 14 | `GET /notices` (`search`, `category`) | any user |
| 15 | `POST /notices` | organizer, admin |
| 16 | `DELETE /notices/:id` | author, admin |
| 17 | `GET /admin/users` | admin |
| 18 | `PATCH /admin/users/:id/role` | admin |

## Real-time (Socket.IO)

The socket handshake is authenticated with the same JWT (bad token = rejected).

| Server -> client event | When |
|---|---|
| `event:created` / `event:updated` / `event:deleted` | an event is posted, edited or removed - every open page updates without refresh |
| `event:attendance` | someone RSVPs/cancels - live "12 / 40 going" counters |
| `notice:created` / `notice:deleted` | notices change |
| `notification` (personal) | RSVP received (organizer), event changed/cancelled (attendees), **new event matching your interests**, **reminder ~1h before start**, role changed |
| `presence` | number of users online |
| `user:role` | your role was changed (page reloads with new permissions) |

Reminder window is `REMINDER_WINDOW_MIN` (default 60). Notifications are live-only (not stored),
so a user who is offline when one fires will not see it.

## Recommendation service (`recommender/`)

`POST /recommend` receives the user's interests, the events they registered for, and the candidate
upcoming events. It builds TF-IDF vectors (unigrams + bigrams, title/tags weighted up), builds a user profile
document (interests weighted 3x + attended events), ranks events by **cosine similarity**, and
returns scores with the matched terms ("because you like python, learning"). Users with no interests and no
history get the most popular upcoming events.

## Tests

With the server running and seeded: `cd backend && npm run smoke` runs 45 checks - all 18
endpoints, role rules, capacity limits, NoSQL-injection attempt, and the live socket events.

## Project layout

```
backend/   server.js, src/{config,models,middleware,controllers,routes,services,utils}, realtime.js, scripts/
recommender/   app.py (Flask)
frontend/  static pages served by Express: index, signup, notices (main), add-event, profile, admin + js/common.js
```
`frontend/` still contains the unused Vite/React scaffold files from the original project
(`src/`, `vite.config.js`, `package.json`); the app does not need them and no frontend build step exists.
