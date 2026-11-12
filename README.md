# Nakal 2 - bills and party ledger in one

For Indian shopkeepers, traders and their staff. Make a bill in under a minute; every bill lands in the party's ledger by itself.

- Preview website (this branch): https://ankurlath83-hue.github.io/Nakal/next/
- Live website (after this branch is merged into `main`): https://ankurlath83-hue.github.io/Nakal/
- Android APK and Windows app: **Releases** > newest > `Nakal.apk`, `Nakal-Windows.exe`

## Parts of the code

| File | What it does |
| --- | --- |
| `js/core.js` | Rupee and Indian commas, dates, financial year, ids |
| `js/i18n.js` | Every label and message in English and Hindi |
| `js/calc.js` | All arithmetic: bill totals, ledger balance, overdue days, item sales |
| `js/security.js` | PIN lock, AES-256-GCM encryption, PBKDF2 (600,000 rounds), backup file, fingerprint |
| `js/store.js` | The book: encrypted records on the device, undo, merge rules |
| `js/keypad.js` | The app's own number and alphabet keypads, laptop keyboard |
| `js/ui.js` | Screens, pop-up sheets, messages, date wheel |
| `js/bills.js` `js/ledger.js` `js/parties.js` `js/catalogue.js` `js/reports.js` `js/more.js` | The screens |
| `js/share.js` | WhatsApp text, picture, PDF, CSV |
| `js/sync.js` | Login, staff, encrypted upload, live sync |
| `js/app.js` | Start-up, first-time setup, lock screen, auto-lock |
| `sw.js` | Offline copy of the app files |
| `firestore.rules` | Who may read and write on the server |
| `electron/` | Windows app wrapper |
| `tests/` | Tests (see below) |

`config.js` holds the app name and the Firebase web settings.

## How sync and security work

- Every bill, payment, party and item is one record. On the device each record is encrypted with a data key; the data key is locked with a key made from the 6-digit PIN.
- With online sync on, each record is encrypted again with the **business key** before upload. The server stores only `c` (scrambled text), `iv`, who wrote it, a deleted flag and times.
- The owner gets a **recovery code** when sync is started. It opens the business key on a new phone.
- A staff phone shows a 6-digit code; the owner approves it after checking the code. Only then is the business key sent to that phone, locked so only that phone can open it.
- Two people adding entries at the same time are both kept (each entry is its own record). If the very same record is edited on two phones, the newer edit wins. Bill numbers that clash offline are renumbered.

## Firebase setup (one time)

Firebase console > project `nakal-cdb66` > Firestore Database > Rules: add the `nk_` blocks from `firestore.rules` next to the existing `nakal_bills` / `nakal_members` rules, then Publish.

## Tests

```
node tests/logic.test.js      # 320 bills + 160 payments vs a separate calculation; lock, PIN change, backup, erase, restore
npx firebase emulators:start --only firestore,auth --project nakal-cdb66   # then, in another terminal:
node tests/rules.test.js      # 63 checks of the Firebase rules
python3 tests/browser/ui_test.py     # real app in headless Chrome: screens at 320/360/390 px, English + Hindi, laptop keyboard
python3 tests/browser/sync_test.py   # owner phone + staff phone + owner's new phone, offline on both
```

## Builds

Every push runs `.github/workflows/android.yml`:
- `main`: updates the live website, builds `Nakal.apk`, `Nakal.aab` (when the signing secrets are set) and `Nakal-Windows.exe` into a release.
- other branches: publishes a preview website at `/next/` and a pre-release whose APK installs beside the real app as "Nakal 2".
