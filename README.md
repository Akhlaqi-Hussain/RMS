<div align="center">

# 🍽️ RMS — Restaurant Management System

**Orders by table · kitchen tickets · payments and bills · menu, staff and tables · sales reports**

Trilingual (**English · دری · پښتو**) · fully **offline** · role-based access

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.9-339933?logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

</div>

<p align="center">
  <img src="docs/screenshots/dashboard-en.png" alt="Dashboard (English)" width="49%">
  <img src="docs/screenshots/orders-fa.png" alt="Orders (Dari, right-to-left)" width="49%">
</p>

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Roles and permissions](#roles-and-permissions)
- [Tech stack and architecture](#tech-stack-and-architecture)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Everyday commands](#everyday-commands)
- [Languages](#languages)
- [Offline use and fonts](#offline-use-and-fonts)
- [Database](#database)
- [Testing](#testing)
- [Security](#security)
- [Project structure](#project-structure)
- [Before going to production](#before-going-to-production)
- [License](#license)
- [Credits](#credits)

## Features

| | |
|---|---|
| 🧾 **Ordering** | Browse the menu by category, add to a cart, place an order for a table or add items to an open order |
| 👨‍🍳 **Kitchen** | A kitchen ticket prints automatically for new orders; items move from *pending* to *in progress* |
| 💵 **Payment** | Discounts, confirmation, printed customer bill; totals are always recalculated by the database |
| 🔒 **Safe saving** | An order and its items are saved together in one database transaction — never half-saved |
| 📊 **Dashboard** | Total and today's revenue, discounts, orders, recent orders and the most popular items |
| 📈 **Reports** | Sales, financial, orders and products reports for any date range, printable |
| 🛠️ **Management** | Menu items with pictures, categories, staff accounts and roles, tables (active/inactive) |
| 🌐 **Three languages** | English (default), Dari and Pashto, with right-to-left layout, Afghan solar calendar and ۱۲۳ digits |
| 📴 **Offline** | Runs on a local network with no internet: all fonts and assets are part of the project |
| 📱 **Responsive** | Phone, tablet and desktop layouts |

## Screenshots

| Menu (English) | Menu management (Pashto) |
|---|---|
| ![Menu](docs/screenshots/menu-en.png) | ![Manage](docs/screenshots/manage-ps.png) |

| Sign-in | Phone (Dari) |
|---|---|
| ![Sign-in](docs/screenshots/login-en.png) | <img src="docs/screenshots/phone-menu-fa.png" alt="Phone view" width="260"> |

## Roles and permissions

| Area | Manager | Cashier | Waiter | Chef |
|---|:---:|:---:|:---:|:---:|
| Menu and placing orders | ✅ | ✅ | ✅ | ✅ |
| Orders list and details | all | all | own orders only | all |
| Send items to the kitchen | ✅ | ✅ | own orders | ✅ |
| Cancel an open order | ✅ | ✅ | own orders | ❌ |
| Payment and customer bill | ✅ | ✅ | ❌ | ❌ |
| Dashboard and reports | ✅ | ❌ | ❌ | ❌ |
| Manage menu, staff and tables | ✅ | ❌ | ❌ | ❌ |

Every page and API request checks the account in the database, so deactivating a user or changing
a role takes effect immediately.

## Tech stack and architecture

| Layer | Technology |
|---|---|
| Front end | Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, React Hot Toast |
| Back end | Next.js route handlers (`app/api`), JWT session cookie, bcrypt password hashes |
| Database | MySQL 8.4 with stored procedures, run in Docker |
| i18n | Own lightweight layer: JSON dictionaries, `Intl` number formats, `jalaali-js` for the solar calendar |

```mermaid
flowchart LR
    B["Browser<br/>(staff device)"] -->|pages and API calls| M["proxy.js<br/>login and role check"]
    M --> P["Pages<br/>app/main/*"]
    M --> A["API routes<br/>app/api/*"]
    A -->|mysql2 pool| D[("MySQL 8.4<br/>stored procedures")]
    P -.->|translations| L["locales/en · fa · ps"]
```

## Getting started

**Requirements:** Node.js 20.9+ LTS, Git, and Docker Desktop (running). Internet is needed only once,
to download the code and the npm packages.

```bash
# 1. Get the code and install the packages
git clone https://github.com/Akhlaqi-Hussain/RMS.git
cd RMS
npm ci        # slow connection: npm ci --fetch-timeout=600000 --fetch-retries=6

# 2. Create your private settings (see "Configuration") from the template
copy .env.example .env.local        # macOS/Linux: cp .env.example .env.local

# 3. Start the database (the first start creates rms_dev and rms_test with sample data)
docker compose --env-file .env.local up -d
docker compose --env-file .env.local ps     # wait for "healthy"

# 4. Start the app, then open http://localhost:3000
npm run dev
```

**Sample accounts** (development and test data only — never use them on a real installation):
`manager1`, `cashier1`, `waiter1`, `chef1`, all with the password `DevOnly@123`.

## Configuration

`.env.local` is private and is never committed. Replace every placeholder with your own strong value.

| Variable | Example | Meaning |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | Database server |
| `DB_PORT` | `3307` | Port of the Docker database (3306 is often used by XAMPP) |
| `DB_USER` | `rms_app` | Limited database user used by the app |
| `DB_PASSWORD` | — | Password of `rms_app` |
| `DB_NAME` | `rms_dev` | `rms_dev` for daily use, `rms_test` for automated tests |
| `JWT_SECRET` | — | Long random string used to sign login cookies |
| `MYSQL_ROOT_PASSWORD` | — | Root password of the Docker database |

## Everyday commands

| Task | Command |
|---|---|
| Start the database | `docker compose --env-file .env.local up -d` |
| Start the app (development) | `npm run dev` |
| Lint | `npm run lint` |
| API regression test (app running on `rms_test`) | `npm run test:api` |
| Production build and start | `npm run build` then `npm start` |
| Stop the database (data is kept) | `docker compose --env-file .env.local stop` |

Backup, restore and a full reset are described in [`database/README.md`](database/README.md).

## Languages

Choose **English**, **دری** or **پښتو** from the switcher at the top. The choice is stored in the
`lang` cookie, and addresses do not change.

| | English | Dari | Pashto |
|---|---|---|---|
| Direction | left-to-right | right-to-left | right-to-left |
| Date | Wed, 21 Oct 2026 | چهارشنبه، ۲۹ میزان ۱۴۰۵ | شورو، ۲۹ تله ۱۴۰۵ |
| Money | 1,250 AFN | ۱٬۲۵۰ ؋ | ۱٬۲۵۰ ؋ |

- Texts are in `locales/en/common.json`, `locales/fa/common.json` and `locales/ps/common.json`;
  keep the same keys in all three files.
- Server and database messages are translated on screen (`lib/i18n/serverMessages.js`).
- The restaurant name, address and phone printed on bills are under `restaurant` in each file;
  the bill number prefix is in `utils/restaurantInfo.js`.
- Data entered by users (menu items, categories, names) is shown as typed.

## Offline use and fonts

Once installed, RMS needs **no internet connection** — not to run and not to build. Nothing is
loaded from other websites.

| Used for | Font | Files |
|---|---|---|
| Dari and Pashto screens, bills and reports | **Vazirmatn** (Vazir), then **Noto Sans Arabic** (also draws ؋), then Tahoma / Segoe UI | `public/fonts/` |
| Tailwind `font-sans` / `font-mono` | Geist, Geist Mono | `app/fonts/` |
| English screens | Arial / Helvetica (installed on every computer) | — |

All bundled fonts are free under the SIL Open Font License; the licence texts are next to the files.

## Database

MySQL 8.4 runs in Docker on `127.0.0.1:3307`, reachable only from the same computer.

- `database/migrations/` — tables and stored procedures (additive; never drops tables)
- `database/seeds/dev_seed.sql` — sample data for development and tests only
- `database/docker-init/01-init.sh` — runs once on first start: creates `rms_dev`, `rms_test` and
  the limited user `rms_app` (no right to create or drop tables)

Prices and bill totals are always taken from the database, never from the browser.

## Testing

The API regression test in [`tests/api/rms-api-test.mjs`](tests/api/rms-api-test.mjs) checks login,
roles, menu, tables, staff, orders (including all-or-nothing saving), kitchen, payment, dashboard,
reports and upload safety — **132 checks**. It needs no extra packages.

1. Window A: `set DB_NAME=rms_test` (macOS/Linux: `export DB_NAME=rms_test`), then `npm start`.
2. Window B, in the project folder: `npm run test:api` → expect `FAIL=0`.
3. **Close window A afterwards**, because the `DB_NAME` setting lasts for the whole window.

The test creates its own uniquely named records and only reads the sample data, so it can be
run many times. Never point it at a real (production) database.

> `rms_dev` and `rms_test` share the picture folder `public/uploads/menu`: deleting a sample menu
> item in either database also deletes its picture for the other.

## Security

- Passwords are stored as bcrypt hashes; login uses an HTTP-only cookie.
- Login and role checks on every page and API route; deactivated accounts are refused immediately.
- Uploaded pictures are checked by their real content (JPEG/PNG/WEBP, max 5 MB) and renamed.
- Database errors are never shown to users; friendly messages only.
- The database port is bound to `127.0.0.1`.
- Production dependencies: `npm audit --omit=dev` reports no known vulnerabilities (Next.js 16.3).

## Project structure

```text
app/            pages (app/main/...), API routes (app/api/...), layout, global styles, fonts
components/     sidebar, cart, language switcher, cards, tables
context/        cart and language state
lib/            database pool, session checks, upload checks, i18n helpers
locales/        en · fa (Dari) · ps (Pashto) dictionaries
schemas/        form validation (zod)
utils/          bill and report printing
database/       migrations, seed data, Docker init script
public/         bundled fonts and uploaded menu pictures
docs/           screenshots for this README
tests/api/      API regression test (npm run test:api)
proxy.js        page and API protection (called middleware.js before Next.js 16)
```

## Before going to production

- A separate database with unique strong passwords and **no sample data**
- The first manager account created by a one-time script
- HTTPS (or a trusted local network only) and automatic off-machine backups
- Not yet tested: printing on a real receipt printer, Safari on iPhone

## License

Proprietary — **all rights reserved**. See [`LICENSE`](LICENSE). The bundled fonts keep their own
SIL Open Font License.

## Credits

Original project by **[Akhlaqi-Hussain](https://github.com/Akhlaqi-Hussain)**.
Database integration, security hardening, translations and offline support by
**[Habibullah Farahmand](https://github.com/HabibullahFarahmand)**.

Fonts: [Vazirmatn](https://github.com/rastikerdar/vazirmatn) ·
[Noto Sans Arabic](https://github.com/notofonts/arabic) ·
[Geist](https://github.com/vercel/geist-font) — all under the SIL Open Font License 1.1.
