# Real-device test checklist

These checks can only be done **with real hardware** in the restaurant. They were not possible in Claude's test copy.

**Use test data only:** `rms_dev`, or `rms_prod` *before* opening day. Write the result in the last column: **OK**, **Problem** (with a short note or a photo), or **Not tested**.

Date: ____________  Tester: ____________  RMS version (commit): ____________

## A. Receipt printer (on the RMS PC)

**Before you start:** the printer is installed in Windows and a Windows test page prints. In Settings → Printers, set it as the **default printer**. For a thermal printer, set the paper to 80 mm (or 58 mm) in the printer properties.

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| A1 | Customer bill, English | Order → Bill → Print customer bill | Restaurant name, date, items, quantities, totals, discount; nothing cut off on the right | |
| A2 | Customer bill, Dari | Switch the language to دری, then print again | Right-to-left; Wazir font (not boxes or question marks); numbers in Persian digits; date in the Solar calendar | |
| A3 | Customer bill, Pashto | The same in پښتو | As A2, with Pashto texts | |
| A4 | Kitchen bill | Print kitchen bill | Order number, table, note, item names and quantities readable at arm's length | |
| A5 | Long order | An order with 15+ items | Prints completely, no page break inside a line | |
| A6 | Without internet | Unplug the network cable or turn off Wi-Fi, then print A1 and A2 | Prints the same as with internet (the fonts are built in) | |
| A7 | Print dialog | In the print dialog: margins **None** or Minimum, scale 100%, headers and footers **off** | No browser date or URL on the receipt. If there is one, turn off "Headers and footers" once; Chrome remembers it | |
| A8 | Special characters (S1-XSS) | New order with the note `<b>test</b> & "quotes"`, then print the kitchen bill and, after payment, the customer bill | The note prints **exactly as typed**, including `<b>` and `</b>` (it must NOT turn bold), and no pop-up message appears | |

**If a receipt is too wide or too small,** note the paper width and send a photo. The bill layout can be adjusted.

## B. iPhone (Safari) and Android (Chrome) on the restaurant Wi-Fi

**Before you start:** the steps in GOING-LIVE Step 6 are done (fixed address, Private network, firewall rule, and `COOKIE_SECURE=false` in `.env.local`, then RMS restarted).

> **If B2 sends you back to the login page,** `COOKIE_SECURE=false` is missing from `.env.local`, or RMS was not restarted after you added it.

| # | Check | How | Expected | Result |
|---|---|---|---|---|
| B1 | Open RMS | On the phone, open `http://<PC-address>:3000` | The login page appears within about 2 seconds | |
| B2 | Log in | As a waiter | The orders page opens; you stay logged in when you go to another page | |
| B3 | Sidebar | Open and close the menu (☰) | It opens over the page; the buttons are not hidden; closing it works | |
| B4 | Menu and cart | Choose a category, search for an item, add 2 items to the cart | The pictures load; the cart count goes up | |
| B5 | Order | Checkout → new order for a table | "Order created"; the order appears in Orders on the PC too | |
| B6 | Languages | Switch to دری and to پښتو | Right-to-left layout, Wazir font, nothing cut off | |
| B7 | Rotate the phone | Portrait and landscape | No sideways scrolling | |
| B8 | Home screen | Safari → Share → Add to Home Screen | The icon opens RMS | |
| B9 | Log out | Log out | Back to the login page; Back does not show orders | |
| B10 | Printing from the phone | Optional: Bill → Print on the phone | iPhone needs an AirPrint printer. Usually the cashier prints from the PC (part A) | |

## C. Offline (no internet at all)

| # | Check | Expected | Result |
|---|---|---|---|
| C1 | Unplug the internet (router WAN cable) but keep the Wi-Fi on | The PC and phones can still use RMS | |
| C2 | Restart the PC without internet | Docker and RMS start; login works | |
| C3 | Fonts and icons offline | Same look as online, with no empty squares | |

## D. Backup and restore (on a **development** copy, never on the live folder)

| # | Check | Expected | Result |
|---|---|---|---|
| D1 | Manage → Backups → Back up now | A green message; the new file is in the list | |
| D2 | Second copy | The same file is in `BACKUP_COPY_DIR` | |
| D3 | Download | The file downloads and opens as a `.tar.gz` | |
| D4 | The next morning | The list shows the automatic backup of the night | |
| D5 | Restore drill on `rms_test` | `npm run restore -- --latest --db rms_test` → `RESTORED … all 8 tables match` | |

## E. Several people at once

| # | Check | Expected | Result |
|---|---|---|---|
| E1 | 2 waiters order for different tables at the same time | Both orders are saved, with no mix-up | |
| E2 | Cashier pays while a waiter adds items to another order | Both work | |
| E3 | Chef screen open for 1 hour | It still shows new orders. Note whether you have to reload it | |

## F. Licence (Windows PC, licence check switched on)

| # | Check | Expected | Result |
|---|---|---|---|
| F1 | Start RMS with the licence check on (Round 9 runbook) and open RMS | The licence page opens with a machine code and the provider's contact details | |
| F2 | The same machine code after a restart of RMS and of the PC | Exactly the same code | |
| F3 | Activate with a code from the licence tool | "Licensed until …"; login works | |
| F4 | A 20-day code | Yellow bar for everyone; daily pop-up for managers | |

**Send the filled-in table back,** with photos of the receipts. Every **Problem** becomes a small, separate fix proposal.
