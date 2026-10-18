# Master Thai Parts & Accessories — Inventory System

My shop's parts-inventory website, rebuilt from a PHP/MySQL-style prototype into a static site backed by **Supabase** (Postgres + Auth + Row Level Security) and hosted free on **GitHub Pages**. Same pages and flow as the original — new design, cloud database.

**Live demo:** _add your GitHub Pages link here_ (click **Try the live demo** on the login page)

## Pages (same as the original)
| Page | What it does |
|---|---|
| `index.html` | Username + password login, live date/time, shop address |
| `dashboard.html` | Home — category cards and recently added parts |
| `category.html` | "Stocks" — six category buttons |
| `brakeparts.html`, `engineparts.html`, `exhaustsystem.html`, `fuels.html`, `suspension.html`, `transmissionandclutch.html` | Add (shows/hides the form: Name, Description, Category), keyword Search, table with ID · Name · Description · Category · Delete |
| `profile.html` | Account info, change password |
| `report.html` | Parts per section, full parts list, print / CSV |

## Tech
Vanilla JavaScript (ES modules), CSS, Supabase JS v2, Ionicons. No build step.

## What changed from the PHP version
- Login: the old `login` table compared plain-text passwords. Supabase Auth now stores hashed passwords; the login page keeps the same "Username not found." / "Incorrect password." messages.
- Data: PHP + MySQL became Supabase Postgres with Row Level Security. Parts keep the same fields (ID, Name, Description, Category).

## Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste `supabase/schema.sql` → Run.
3. **Authentication → Providers → Email**: turn **off** "Confirm email". Then **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up" (staff accounts are created by the owner only).
4. **Authentication → Users → Add user**. The login uses usernames, so enter the email as `username@masterthaiparts.app` (e.g. `admin@masterthaiparts.app`) and a password. Staff then log in with just `admin` + the password.
5. **Project Settings → API**: copy the Project URL and anon key into `js/config.js`.
6. Run locally: `python3 -m http.server 8000` → http://localhost:8000

> The anon key is meant to be public; the RLS policies in `schema.sql` are what protect the data. Never commit the `service_role` key.
> The `username_exists` function lets the login page tell "username not found" from "wrong password", like the original. The trade-off is that someone could test whether a username exists.

## Deploy to GitHub Pages
1. Push this folder to a GitHub repo.
2. **Settings → Pages → Deploy from branch → `main` / root**.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your Pages URL.

## Structure
```
index.html + 10 page .html files
css/style.css      one stylesheet for all pages
js/config.js       Supabase keys, shop info, categories
js/store.js        Supabase + demo data, auth
js/login.js        login page
js/pages.js        navbar/sidebar + every other page
supabase/schema.sql
assets/            logo + background
```

Brand and logo design by RBruceDesign.
