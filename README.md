# Master Thai Parts & Accessories — Inventory System

A parts inventory dashboard for a motorcycle parts shop, rebuilt from a static HTML/CSS prototype into a working app with **Supabase** (Postgres, Auth, Row Level Security) and deployed free on **GitHub Pages**.

**Live demo:** _add your GitHub Pages link here_

## Features
- Email/password authentication (Supabase Auth)
- Per-user data isolation with Row Level Security
- Add, edit, delete parts with validation
- Categories: Brakes, Engine, Exhaust, Fuel, Suspension
- Search, stock-level filter, sortable columns
- Stats: total parts, units, inventory value (₱), low/out-of-stock counts
- Stock-by-category chart, CSV export
- **Demo mode** — visitors can try it with sample data, no account needed
- Responsive layout (mobile sidebar)

## Tech
Vanilla JavaScript (ES modules), CSS, Supabase JS v2. No build step.

## Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
4. Paste them into `js/config.js`.
5. (Optional) In **Authentication → Providers → Email**, turn off "Confirm email" for easier testing.
6. Run locally: `python3 -m http.server 8000` then open http://localhost:8000

> The anon key is meant to be public. Security comes from the RLS policies in `schema.sql`. Never commit the `service_role` key.

## Deploy to GitHub Pages
1. Create a GitHub repo and push this folder.
2. Repo **Settings → Pages → Deploy from branch → `main` / root**.
3. In Supabase **Authentication → URL Configuration**, add your Pages URL as the Site URL.

## Project structure
```
index.html
css/style.css
js/config.js   # Supabase keys + categories
js/data.js     # demo store, Supabase store, auth
js/app.js      # UI logic
supabase/schema.sql
assets/        # logo + banner
```

## Credits
Brand and logo design by RBruceDesign. Shop: Master Thai Parts & Accessories.
