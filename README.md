# Nakal

Bill entry app with its own keypads. The owner and approved staff sign in and share the same bills on any device.

- Website: https://ankurlath83-hue.github.io/Nakal/ (capital N matters)
- Android: **Releases** > newest version > **Nakal.apk**
- Laptop: open the website in Edge or Chrome and choose "Install Nakal"

## How it works

- `index.html` is the whole app; `config.js` holds the Firebase web settings; `vendor/` holds the Firebase browser libraries.
- Logins and bills live in Nakal's own Firebase project, `nakal-cdb66` (Firestore in Mumbai, email and password sign-in). Bills are in the `nakal_bills` collection and the staff list in `nakal_members`.
- Access is decided by the Firestore rules of that project: everyone needs a verified email; the owner's email always has access, and anyone else must be added by the owner under **Saved > Staff**.
- The app keeps a copy of the bills on the device, so it opens and saves without internet and syncs later.

## Adding a staff member

1. Owner: sign in, open **Saved**, type the staff email under **Staff**, press **Add**.
2. Staff: open Nakal, press **Create account**, use that same email, open the verification link from the inbox, then press **Check again**.

## Builds

Every push to `main` updates the website (branch `gh-pages`) and builds the Android app. The Play Store bundle is signed only when the secrets `NAKAL_KEYSTORE_B64` and `NAKAL_KEYSTORE_PASS` are both correct; otherwise an unsigned bundle is attached and the APK gets a one-time key (uninstall the old app before installing a new build).
