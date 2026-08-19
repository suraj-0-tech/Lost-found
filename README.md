# Campus Lost & Found Portal

A full-stack mini project: students report and search for lost/found items on
campus; admins moderate listings and manage users.

**Stack:** Node.js + Express + MongoDB (Mongoose) on the backend, JWT auth,
Multer for image uploads, and a plain HTML/CSS/JavaScript frontend (no
framework required — open the files directly in a browser).

---

## 1. Folder structure

```
lost-found-portal/
├── backend/
│   ├── config/db.js            MongoDB connection
│   ├── models/                 User, Item, Claim (Mongoose schemas)
│   ├── middleware/              auth.js (JWT), upload.js (Multer), admin check
│   ├── controllers/             business logic for auth / items / claims / admin
│   ├── routes/                  Express route definitions
│   ├── utils/seedAdmin.js       creates your first admin account
│   ├── uploads/                 uploaded item photos land here (auto-created)
│   ├── server.js                app entry point
│   ├── package.json
│   └── .env.example             copy to .env and fill in
└── frontend/
    ├── index.html                login / register
    ├── search.html               browse + filter + claim items
    ├── dashboard.html             report items, view your reports & claims
    ├── admin.html                 approvals, listings, users, stats
    ├── css/style.css              shared "notice board" theme
    └── js/                        api.js (fetch wrapper), auth.js, search.js,
                                    dashboard.js, admin.js
```

---

## 2. Backend setup

**Requirements:** Node.js 18+ and a MongoDB instance (local install, Docker,
or a free MongoDB Atlas cluster).

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:

- `MONGO_URI` — e.g. `mongodb://127.0.0.1:27017/lost_found_portal` for a
  local Mongo, or your Atlas connection string.
- `JWT_SECRET` — any long random string (e.g. `openssl rand -hex 32`).
- `CLIENT_ORIGIN` — where your frontend is served from, if you use a local
  dev server (Live Server on VS Code, `npx serve`, etc). Comma-separated if
  you need more than one.

Start MongoDB (if running locally), then create your first admin account:

```bash
npm run seed:admin
```

This creates `admin@campus.edu` / `Admin@123` by default — override with
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` environment variables if you
want different values. **Change this password after your first login.**

Run the API:

```bash
npm start        # production
npm run dev       # auto-restart on changes (requires the nodemon devDependency)
```

The API listens on `http://localhost:5000` by default. Check
`http://localhost:5000/api/health` to confirm it's up.

---

## 3. Frontend setup

No build step — it's static HTML/CSS/JS. Two options:

- **Simplest:** open `frontend/index.html` directly in your browser.
- **Recommended:** serve it with a local dev server so relative paths and
  CORS behave predictably, e.g. from the `frontend/` folder:
  ```bash
  npx serve .
  # or, with VS Code's Live Server extension, right-click index.html → "Open with Live Server"
  ```

If your frontend runs on a different port/origin than `http://localhost:5000`,
add that origin to `CLIENT_ORIGIN` in the backend `.env` file.

The API base URL is set at the top of `frontend/js/api.js`
(`const API_BASE = "http://localhost:5000/api"`) — change it if your backend
runs elsewhere (e.g. a deployed URL).

### GitHub Pages

GitHub Pages serves the repository root, so the root `index.html` redirects to
the static frontend entry point at `frontend/index.html`. In repository
settings, use **Deploy from a branch**, select the `main` branch, and select
`/(root)` as the folder.

GitHub Pages cannot run the Node.js backend or MongoDB. Deploy the backend to a
separate service, then update `API_BASE` and `imageUrl` in
`frontend/js/api.js` to use that backend's public HTTPS URL before deploying.

---

## 4. Using the app

1. Register a student account (or log in as the seeded admin).
2. As a student: **My Reports** → fill out the form to report a lost or
   found item (photo optional). New reports start as `pending` and are only
   publicly visible on **Browse Items** once an admin approves them.
3. As a student browsing: search/filter by keyword, category, location,
   date, or Lost/Found, then **Claim / Contact** an item you recognize.
4. The original reporter sees incoming claims under **My Reports → Claims on
   My Items**, and can approve or reject each one. Approving a claim
   automatically marks the item as resolved (`claimed`).
5. As an admin: **Admin** tab → approve/reject pending reports, remove
   fake/duplicate listings from all listings, block/unblock or delete users,
   and view live stats (totals, lost vs. found, resolved, pending review).

---

## 5. API reference (quick overview)

All endpoints are prefixed with `/api`. Protected routes require
`Authorization: Bearer <token>`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | create account |
| POST | `/auth/login` | public | get a JWT |
| GET | `/auth/me` | logged in | current user profile |
| GET | `/items` | public* | search/filter approved, open items |
| GET | `/items/mine` | logged in | your own reports (any status) |
| GET | `/items/:id` | public | single item |
| POST | `/items` | logged in | report a lost/found item (`multipart/form-data`, field `image`) |
| PATCH | `/items/:id` | owner | edit your report (re-enters pending review) |
| DELETE | `/items/:id` | owner/admin | delete a report |
| PATCH | `/items/:id/claim` | owner/admin | mark an item resolved |
| POST | `/claims` | logged in | claim/contact about an item |
| GET | `/claims/mine` | logged in | claims you've made |
| GET | `/claims/item/:itemId` | item owner/admin | claims made on one of your items |
| PATCH | `/claims/:id` | item owner/admin | approve/reject a claim |
| GET | `/admin/items` | admin | all reports, any approval state |
| PATCH | `/admin/items/:id/approve` | admin | approve a report |
| PATCH | `/admin/items/:id/reject` | admin | reject a report (with reason) |
| DELETE | `/admin/items/:id` | admin | remove any listing |
| GET | `/admin/users` | admin | list all users |
| PATCH | `/admin/users/:id/block` | admin | toggle block/unblock |
| DELETE | `/admin/users/:id` | admin | delete a user (and their reports) |
| GET | `/admin/stats` | admin | dashboard totals + category breakdown |

\* `/items` requires a valid token in this build (the frontend always sends
one), but the route itself has no role restriction — you can drop `protect`
from that route if you want fully public browsing without login.

---

## 6. What's built vs. what's left as an extension

**Built (core spec):** registration/login (JWT + bcrypt), report lost/found
items with photo upload, keyword search + category/location/date filters,
mark items claimed, view own reports, admin approve/reject/remove listings,
user management (block/delete), stats dashboard, role-based access control.

**Left as extensions** (per the project brief's "Advanced Features" and
"Future Enhancements" lists — each would be a substantial addition on top of
this working base):
- AI image similarity search between lost/found photos
- QR codes for item pickup, and OTP verification at handoff
- Email notifications (e.g. via Nodemailer + a transactional email provider)
- Real-time chat (Socket.IO) between finder and owner
- Interactive campus map of found locations (e.g. Leaflet/Google Maps)
- Chart-based admin analytics (Chart.js on top of the existing `/admin/stats`
  endpoint, which already returns the raw numbers)
- Dark mode toggle
- Mobile app version, barcode scanning, auto-category detection, push
  notifications

The backend's REST structure (especially `/admin/stats` and the Item schema)
is set up so most of these can be layered on without reworking the core.
