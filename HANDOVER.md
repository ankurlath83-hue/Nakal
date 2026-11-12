# Nakal 2 handover (12 Nov 2026)

## What you have

| Thing | Where | State |
| --- | --- | --- |
| Website (preview) | https://ankurlath83-hue.github.io/Nakal/next/ | Live. Old Nakal is untouched at /Nakal/ |
| Android APK | https://github.com/ankurlath83-hue/Nakal/releases/tag/preview-16 > `Nakal.apk` | Built. Installs beside old Nakal as "Nakal 2". Signed with a one-time key (see "Needs you" 2) |
| Windows app | same page > `Nakal-Windows.exe` | Built. Not signed (see "Not tested") |
| Code | branch `v2` of the Nakal repo | Pushed |

## Needs you (I cannot do these)

1. **Firebase rules.** Until this is done, sign-in works but sync says "Not allowed".
   Firebase console > project nakal-cdb66 > Firestore Database > Rules. Copy everything in `firestore.rules`
   from `function signedIn()` down to the closing brace of the `match /nk_biz/{b}` block, and paste it inside
   your existing rules, just before the last two closing braces. Press Publish.
   Add, do not replace: replacing would switch off the old Nakal app and the "bring old bills" button.
2. **Signing key.** The build says the secrets `NAKAL_KEYSTORE_B64` / `NAKAL_KEYSTORE_PASS` are wrong or incomplete.
   So the APK has a throw-away key and the Play Store file (`.aab`) is unsigned. Re-paste both secrets
   (repo > Settings > Secrets and variables > Actions), then re-run the build.
3. **The name.** You chose "a new name" but did not type one. The app still says Nakal. Tell me the name; it is one line in `config.js` plus the manifest and Android name.
4. **Switch over.** When you are happy with the preview, say so and I merge `v2` into `main`. That replaces the old website and makes the real APK (same app id `in.nakal.app`).

## What I tested (all passed)

1. **320 bills + 160 payments/entries, 25 parties, 20 items**, dates Feb 2025 to Nov 2026, with an edit, a delete and an undo.
   Every party's bill total, paid total, balance, last paid date, last bill date and overdue days, and every item's quantity,
   amount, bill count and average rate for all four periods, were compared with a second calculation written separately
   (whole paise, different code). 25 balances and 70 item lines matched. (`tests/logic.test.js`, also runs on every build.)
2. **Lock and backup**, both in code and through the real screens: lock empties the screen and memory; 3 wrong PINs
   force a 30 second wait, then 60; PIN change (old PIN refused after); auto-lock when idle; backup file contains no readable
   text; wrong backup password refused; a tampered backup refused; erase leaves zero stored records; restore brings back
   the same totals; restoring twice adds nothing. Stored records on the device contain no readable names. PBKDF2 rounds = 600,000.
3. **Firebase rules: 63 checks** on the Firestore emulator (`tests/rules.test.js`). Strangers, other owners, unverified
   emails and signed-out users are refused everywhere; staff cannot add staff or approve themselves; entry-only staff
   cannot edit or delete others' entries; removed staff are refused. The test prints each "allowed"/"refused" line.
4. **Sync with three devices** in real Chrome against the Firebase emulators (`tests/browser/sync_test.py`):
   owner phone, staff phone, owner's second phone. Staff phone got nothing before approval; approval code matched on both;
   entries crossed in both directions; **both phones offline, both made bills and payments, both sets arrived** and the
   two bills that clashed on number became 4 and 5; server documents contained no party, item or amount text;
   wrong recovery code refused, right one restored the book; entry-only: export and delete hidden, a forced delete was
   refused by the server and undone; removed staff stopped receiving; lock/unlock caught up.
5. **Every screen at 320, 360 and 390 px, English and Hindi**: 156 screen states (with and without keypad, sheets, date
   wheel, lock screen) plus tablet in dark mode. Nothing wider than the screen, no missing word in either language,
   every button and box 44 px or taller, only the four text sizes 14/16/20/32 in use.
6. **Bill flow**: tip on first bill, catalogue suggestion fills rate and jumps to quantity, new row after quantity,
   grand total and Save sit above the keypad, bill numbers run, Undo. **Ledger**: two sides, balance, Paid/Bill keys,
   quick notes, tapping a bill entry opens the bill, editing a bill changes the ledger. **Date wheel**.
   **Laptop**: real keyboard, Enter/Tab next box, P = Paid, B = Bill, Esc = close.
7. **Sharing output**: bill picture and PDF, statement picture and PDF, rate chart picture, three CSVs, WhatsApp link
   with 91 + 10 digits, reminder text in Hindi.
8. **Live preview site**: opened, made a bill; then with internet cut it reopened from its saved copy, unlocked and saved a bill.
9. **Windows wrapper** started on Linux (not Windows) and loaded the app, set a PIN and saved a bill.

Bugs found and fixed while testing: keypad backspace could keep repeating; date wheel could jump to 1 Jan; a new phone
joining could overwrite the business name; removed staff kept receiving until restart; staff could not request a key
(rules); no way to close the keypad on the ledger screen.

## What I could not test

- **Real Firebase.** All sync tests used the local emulator. Your real project's rules are not published yet, and real verification emails were not sent.
- **A real Android phone.** The APK was built but never installed. Unchecked there: share sheet for picture/PDF/CSV/backup,
  WhatsApp opening, the phone's back button, speed on a cheap phone (open time was 0.3 s on my server; unlocking does
  600,000 PBKDF2 rounds and may take 1-2 s on a slow phone).
- **Fingerprint.** Written for browsers that support passkeys with PRF; could not be tested (no sensor here).
  It will **not** appear inside the Android APK: that needs a native plugin, which I did not add because I could not test it.
- **Windows.** `Nakal-Windows.exe` was built but not run on Windows. It is unsigned, so Smart App Control on Zerok victus
  will probably block it, as it did your earlier .exe. The working route on that laptop: open the website in Edge > Install.
  A signed .exe needs a paid code-signing certificate.
- **Play Store.** Nothing was uploaded.
- **Bringing old Nakal bills.** Written, but I cannot read your real data, so it is untested.
- **Hindi wording** was written by me and not checked by a Hindi-speaking shopkeeper.

## Decisions I made

1. The app works fully without login. Online sync is optional under More > Online and staff.
2. A bill is not copied into the ledger; the ledger reads bills directly, so edit/delete can never go out of step.
3. Overdue = today minus (date of oldest unpaid bill + credit days). Payments clear oldest bills first. Default credit days 30.
4. Catalogue rate changes only on the Items screen; a different rate typed in a bill does not change it.
5. Backup file uses its own password (8+ characters), not the PIN, because a 6-digit PIN is too weak for a file that travels.
6. Restore merges: adds what is missing and keeps the newer copy of each record.
7. Owner gets a 16-character recovery code when sync starts; it is the only way to open the book on a new phone without an already-open phone.
8. Staff phones need the owner's approval with a 6-digit code shown on both phones.
9. One staff email belongs to one business.
10. Entry-only staff: add entries, edit only their own, Undo their own entry within 10 minutes, no delete, no export, no backup, no settings.
11. Same record edited on two phones: newer edit wins (per record, never for the whole book). Clashing bill numbers: the later bill moves to the next free number.
12. Wrong PIN: 3 free tries, then 30 s, doubling to 1 hour.
13. Auto-lock after 2 minutes idle (1/2/5/10 in Settings).
14. Alphabet keypad is English letters, numbers and symbols. Hindi letters cannot be typed; labels and messages are Hindi.
15. Tapping an empty part of the page closes the keypad. Pop-up sheets open their keypad by themselves.
16. Statement on WhatsApp shows the last 40 lines plus totals; the picture/PDF shows everything.
17. PDF is one page holding the bill picture (so Hindi prints correctly).
18. Cash counter stays on the device and is not synced.
19. Business name is stored unencrypted on the device, because the lock screen shows it before the PIN.
20. Preview builds use app id `in.nakal.app.next` so they do not replace the installed Nakal.
21. No voice read-out (not in this brief).

## What is protected, and what is not

Protected:
- The book on the device: AES-256-GCM, key from the PIN via PBKDF2-SHA256, 600,000 rounds. The PIN is not stored.
- Online copy: encrypted on the device with the business key before upload. The server holds scrambled text only.
- The business key reaches only phones the owner approves, or the owner's recovery code.
- Server access: only the owner and listed staff with verified email, enforced by rules (tested).
- Backup file: encrypted with the backup password; a changed file is rejected.
- No ads, trackers or analytics. No permissions beyond internet.

Not protected:
- A 6-digit PIN has only 1,000,000 values. Someone who copies the device's storage can try them all on a computer in days or less. The slow-down only applies inside the app.
- An unlocked app shows everything to whoever holds the phone.
- Shared bills, pictures, PDFs and CSVs are plain.
- Removed staff keep what was already on their phone, and still know the business key. The key is not changed on removal.
- "Entry only / no export" hides the buttons; it cannot stop screenshots or a technical person reading their own phone.
- The server can see emails, staff emails, number of records and timing.
- Approval relies on the owner comparing the 6-digit code. Approving without checking weakens it.
- Forgotten PIN + no sync + no backup = the book is gone. Forgotten recovery code with no open phone = online copy cannot be opened.
- Business name on the lock screen, and the app's own files, are not secret.
- A phone with malware is outside what the app can defend.

## Play Store steps

1. Do "Needs you" 1, 2 and 4 first, so the build produces a signed `Nakal.aab` from `main`.
2. Play Console > Create app. Name, language English (India), App, Free.
3. App content: Privacy policy URL `https://ankurlath83-hue.github.io/Nakal/privacy.html`; Ads: No; Data safety: collects email
   (account), data encrypted in transit, users can request deletion; Target audience 18+; Content rating questionnaire.
4. Store listing: short and full description, icon 512 px (`icon-512.png`), feature graphic 1024x500, at least 2 phone screenshots.
5. Testing > Closed testing: upload `Nakal.aab`. A new personal account must run a closed test with 12 testers for 14 days before production is allowed.
6. After that: Production > Create release > same `.aab` > Send for review.
7. Keep the keystore file and password safe. Losing them means you can never update the app.
