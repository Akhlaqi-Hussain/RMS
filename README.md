# RMS — Restaurant Management System

A web app for running a restaurant: taking orders by table, sending them to the kitchen,
taking payment with a printed bill, managing the menu, staff and tables, and viewing
sales reports. It works in **English** (default), **Dari** and **Pashto**.

## Features

| Area | What it does | Who can use it |
|---|---|---|
| Menu | Browse items by category, add to cart, place an order for a table or add to an open order | everyone |
| Orders | List of orders (Active / Paid / Cancelled), order details, kitchen bill, cancel | everyone (waiters see only their own orders; chefs cannot cancel) |
| Payment | Discount, confirm payment, print customer bill | manager, cashier |
| Dashboard | Revenue, today's discounts and orders, recent orders, most popular items | manager |
| Reports | Sales, financial, orders and products reports for a date range; print | manager |
| Manage | Menu items (with picture), staff accounts and roles, tables | manager |

Other behaviour worth knowing:

- **Languages:** choose English, دری or پښتو from the switcher at the top. The choice is kept in a
  browser cookie (`lang`). Dari and Pashto use right-to-left layout, the Afghan solar calendar
  (e.g. ۲۹ میزان ۱۴۰۵), Eastern Arabic digits and ؋. Printed bills and reports follow the language.
- **Security:** passwords are stored as bcrypt hashes; every page and API request checks the
  account in the database, so a deactivated user or a changed role takes effect immediately.
  Prices and bill totals are always calculated by the database, never trusted from the browser.
- **Inactive items/tables** are hidden when taking orders but still listed under Manage, so they
  can be switched back on.

## Technology

- [Next.js 15.5](https://nextjs.org) (App Router) with React 19 and Tailwind CSS 4
- MySQL 8.4 with stored procedures, run locally in Docker
- Node.js 20 or newer

```
app/            pages (app/main/...) and API routes (app/api/...)
components/     shared screen parts (sidebar, cart, language switcher, ...)
context/        cart and language state
lib/            database connection, login/session checks, upload checks, i18n helpers
locales/        translations: en, fa (Dari), ps (Pashto) — common.json in each
schemas/        form validation rules
utils/          bill and report printing, restaurant prefix
database/       migrations, seed data and setup script (see database/README.md)
middleware.js   login and role protection for pages and APIs
```

## First-time setup (Windows, Command Prompt)

1. Install **Node.js 20+ LTS**, **Git** and **Docker Desktop**, and start Docker Desktop.
2. Get the code:
   ```
   git clone https://github.com/Akhlaqi-Hussain/RMS.git
   cd RMS
   npm ci
   ```
   On a slow connection: `npm ci --fetch-timeout=600000 --fetch-retries=6`.
3. Create your private settings file **`.env.local`** from the template `.env.example` and
   replace every `change-me-...` value with your own strong values. Never commit this file.
   ```
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_USER=rms_app
   DB_PASSWORD=...
   DB_NAME=rms_dev
   JWT_SECRET=...            (a long random string)
   MYSQL_ROOT_PASSWORD=...
   ```
4. Start the database (the first start creates the databases `rms_dev` and `rms_test` with
   sample data):
   ```
   docker compose --env-file .env.local up -d
   docker compose --env-file .env.local ps
   ```
   Wait until the status shows `healthy`.
5. Start the app and open http://localhost:3000:
   ```
   npm run dev
   ```

### Sample accounts (development/test data only)

`manager1`, `cashier1`, `waiter1`, `chef1` — password `DevOnly@123`.
These come from `database/seeds/dev_seed.sql` and must **never** be used on a real installation.

## Everyday commands

| Task | Command |
|---|---|
| Start database | `docker compose --env-file .env.local up -d` |
| Start app (development) | `npm run dev` |
| Check code | `npm run lint` |
| Production build / start | `npm run build` then `npm start` |
| Stop app | `Ctrl + C`, then `Y` |
| Stop database (data is kept) | `docker compose --env-file .env.local stop` |

Backup, restore and a full database reset are described in [`database/README.md`](database/README.md).

## Changing texts and translations

All screen texts live in `locales/en/common.json`, `locales/fa/common.json` and
`locales/ps/common.json`. Keep the same keys in all three files. The restaurant name, address
and phone printed on bills are under `restaurant` in each file; the bill number prefix is in
`utils/restaurantInfo.js`.

## Testing

The API regression test (`rms-api-test.mjs`, kept outside this repository) runs against the
**test** database:

1. Window A: `set DB_NAME=rms_test` then `npm start` (or `npm run dev`).
2. Window B: `node rms-api-test.mjs http://localhost:3000 <path to this project>`.
3. Expect `FAIL=0`. **Close window A afterwards** — `set DB_NAME` lasts for the whole window, and
   anything you click there changes the test database.

Note: `rms_dev` and `rms_test` share the picture folder `public/uploads/menu`, so deleting a sample
menu item in either database also deletes its picture for the other.

## Not ready for production yet

Before real use you need: a separate production database with unique strong passwords and **no
sample data**, the first manager account created by a one-time script, HTTPS, and automatic
off-machine backups.
