# Nakal website

Bill entry app with login. You and your staff sign in and share the same bills on any device.

Files: `index.html` (the app), `logo.png`, `config.js` (your settings), `setup.sql` (database setup).

## 1. Supabase (login + database)

1. Create a free account at supabase.com and make a new project.
2. Open SQL Editor, paste everything from `setup.sql`, and run it.
3. Open Authentication settings and turn OFF new user sign-ups.
   This matters: every signed-in user can see all bills, so only people you add should have a login.
4. Open Authentication > Users and add a user (email + password) for yourself and each staff member.
   Tick "auto confirm" so they can sign in straight away.
5. Open Project Settings > API. Copy the Project URL and the publishable (anon) key into `config.js`.
   Never put the secret / service_role key in this file.

## 2. GitHub Pages (website address)

1. Create a new public repository on github.com, for example `nakal`.
2. Upload `index.html`, `logo.png` and `config.js` to it.
3. Open the repository Settings > Pages, choose "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://ankurlath83-hue.github.io/Nakal/` (capital N matters).

## 3. Use it

Open the address on any phone or computer and sign in. On a phone, use the browser menu > "Add to Home screen" to get the Nakal icon.

Menu names on Supabase and GitHub change from time to time; if a label differs, look for the nearest match.

## Android app

Every push to `main` builds the Android app. Open **Releases** > newest version > download **Nakal.apk** on the phone > install (allow "Install unknown apps" once).

If an older Nakal is installed, uninstall it first: each build is signed with a one-time key. Bills live in Supabase, so nothing is lost; just sign in again.
The app has `config.js` built in, so rebuild (push any change) after you edit it.

The website is served from the `gh-pages` branch, which the build keeps equal to `main`.
