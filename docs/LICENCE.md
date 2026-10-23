# RMS licence and first-run setup (Round 9)

An installed RMS (the client package) works only with an **activation code** from the RMS provider. A code is valid on **one computer** and until a **date** (normally 1 year). Everything works offline: no internet is needed to activate or check the licence.

## For the client (restaurant)

| Moment | What you see / do |
|---|---|
| **First start** | RMS opens the **licence page**. Copy the **machine code** (e.g. `SRC6-P73Q-CKMV-HM61-J`) and send it to the RMS provider (WhatsApp / e-mail, shown on the page). |
| **You receive a code** | It starts with `RMS1-` and is about 120 characters long. Paste it into the box and click **Activate**. |
| **First manager** | RMS then opens **First-time setup**. Enter the **setup code** (on the RMS computer, file `setup-code.txt` in the RMS licence folder — in the installed RMS the setup opens this page with the code already filled in) and create the first manager. |
| **Last 30 days** | Everyone sees a yellow bar; managers get a reminder once a day with the provider's contact details and the machine code. RMS keeps working normally. |
| **Renewal** | Send the machine code again; paste the new code on the licence page (Manage → *Licence & activation*). No reinstall, no data change. |
| **Licence ended** | **Read-only**: everyone can log in, look at everything, print and make backups. New orders, payments and changes are refused until a new code is entered. **No data is lost or locked.** |
| **Wrong computer date** | If the computer's clock is set back, RMS is read-only until the date and time are correct. |
| **New / repaired computer** | It has a new machine code: ask the provider for a new code (and restore the backup as usual). |

## For the owner (issuing codes)

The licence tool is a separate folder (**RMS-LICENCE-TOOL.zip**). Keep it on your own computer — **never** give it to a client and **never** put it into this repository.

```
node rms-licence.mjs init                                  once: your key pair + passphrase
node rms-licence.mjs public-key-module > <RMS>\lib\licence\ownerKey.mjs   once: public key into RMS
node rms-licence.mjs issue --machine SRC6-P73Q-CKMV-HM61-J --client "Kabul Grill" --days 365
node rms-licence.mjs renew --machine SRC6-P73Q-CKMV-HM61-J          +365 days after the last end date
node rms-licence.mjs list                                  all licences you issued
```

- **Back up the tool folder** (with `keys\owner-key.json`) on **two USB sticks** and remember the passphrase. Without the private key you cannot make codes for existing installations.
- The **public** key in `lib/licence/ownerKey.mjs` may be committed: it can only *check* codes.
- `npm run package` refuses to build a client package while that public key is not set.

## How it is protected — and its limits

- Codes are signed with your private key (Ed25519). RMS contains only the public key, so nobody can make a code without your key file and passphrase.
- A code contains the machine it is for, its number and its dates; changing anything breaks the signature.
- The check runs **on the server**, on every request, not in the browser. In the client package it is **built in**: no setting can switch it off.
- A code that ends **earlier** than the current licence is refused, so nobody can shorten a licence by entering an old code.
- **Limits (honest):** someone with expert knowledge can change the installed program files to skip the check; an offline licence cannot be cancelled before its end date; a cloned Windows disk keeps the same machine code; a clock check can be fooled with effort. The licence stops casual copying and documents who is allowed to use RMS — it is not unbreakable.

## For development and tests

- The development copy (`npm run dev` / `npm start`) does **not** check the licence unless `RMS_LICENCE=required` is set.
- `npm run test:licence` (after `npm run build`, with the database running) starts its own test server with the licence check on and a throwaway test key, and checks all states: no licence, wrong codes, 30-day reminder, renewal, read-only, clock set back, changed licence file. With `-- --setup-db <empty database>` it also tests the first-run setup.
- A development copy keeps its licence files in `.rms-licence\` (ignored by Git); an installed RMS in `<data folder>\licence\`.
