// App settings. The Firebase web settings are public identifiers, not passwords;
// access is controlled by the Firestore rules in firestore.rules.
window.NK = window.NK || {};
NK.cfg = {
  appName: "Nakal",          // the one place to change the app's name
  version: "2.0.0",
  firebase: {
    apiKey: "AIzaSyDkPlNia17RW8_xpMvp9nosAQOgk594q3Y",
    authDomain: "nakal-cdb66.firebaseapp.com",
    projectId: "nakal-cdb66",
    storageBucket: "nakal-cdb66.firebasestorage.app",
    messagingSenderId: "416887078075",
    appId: "1:416887078075:web:d76e0d6fb64226a3acfd9e"
  }
};
// Tests point the app at a local Firebase emulator with ?emu=1
if (/[?&]emu=1/.test(location.search)) NK.cfg.emulator = "127.0.0.1";
if (/[?&]touch=1/.test(location.search)) NK.forceTouch = true;
