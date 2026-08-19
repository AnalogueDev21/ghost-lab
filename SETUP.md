# Ghost Lab — Setup Guide

## 1. Create a Supabase project
1. Go to supabase.com → New Project
2. Wait for it to finish provisioning
3. Go to **SQL Editor**, paste and run `supabase/schema.sql` (creates all tables + RLS)
4. Then paste and run `supabase/seed.sql` (creates the 2 branches + a few starter services)

## 2. Create staff logins (Ren, Enma)
This is the **only way** to add staff accounts — there's no self-signup page
in the app anymore (it needed email confirmation through Supabase Auth,
which caused more friction than it was worth for an internal PIN system).
Whenever a new person joins, an owner edits the `STAFF` list below and reruns
this script.

Auth users can't be created via plain SQL — use the seed script:

```bash
cd scripts
npm install @supabase/supabase-js dotenv
```

Create `scripts/.env.local`:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
(Both found in Supabase Dashboard → Project Settings → API. The service role key is secret — never commit it or put it in the frontend.)

Edit the `STAFF` array in `scripts/seed-staff.mjs` if you want different names/roles/PINs, then:

```bash
node scripts/seed-staff.mjs
```

This creates a real Supabase Auth user per staff member (PIN = their password under the hood) and the matching `staff` table row.

## 3. Run the app locally
```bash
npm install
cp .env.example .env
```
Fill in `.env` with your project's URL + anon key (Project Settings → API → anon/public key — this one IS safe for the frontend).

```bash
npm run dev
```
Open the printed localhost URL. Log in with Ren / PIN 1234 or Enma / PIN 5678 (or whatever you set).

## 4. Deploy to Vercel
1. Push this folder to a GitHub repo
2. Import the repo in Vercel
3. Add the same two env vars from `.env` in Vercel's Project Settings → Environment Variables
4. Deploy

## What's built so far
- Login (real PIN auth via Supabase)
- Role-based sidebar + route guards (8 roles, matching what we agreed on)
- Home dashboard (today's bills, commission, on-shift count — all live data)
- Garage POS + Ghost Chill POS (add services to cart, submit real bills)
- Attendance (clock in/out, live)

## What's stubbed (routed + role-guarded, UI not built yet)
- Services Catalog (price/material management)
- Members & Coupons
- Stock & Prepay
- Expenses
- My Profile (pay periods, bill history)

Next session: pick one of the stubbed pages and we build it out the same way as POS/Attendance.
