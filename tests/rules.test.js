/* TEST: Firebase rules. Needs the Firestore emulator running on 127.0.0.1:8080.
   Run: node tests/rules.test.js
   Shows that a business can be read and written only by its own owner and approved staff. */
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, query, where } = require('firebase/firestore');

(async () => {
  const env = await initializeTestEnvironment({ projectId: 'nakal-cdb66', firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') } });
  await env.clearFirestore();
  const who = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
  const owner = who('owner1', 'owner@shop.in'), staff = who('staff1', 'staff@shop.in'), entry = who('entry1', 'entry@shop.in');
  const stranger = who('x1', 'stranger@else.in'), otherOwner = who('owner2', 'other@shop.in'), unverified = who('u9', 'staff@shop.in', false), nobody = env.unauthenticatedContext().firestore();
  const rec = (uid, del = false) => ({ c: 'ciphertext', iv: 'iv', by: uid, del, m: 1, u: serverTimestamp() });
  let n = 0; const ok = async (what, p) => { await assertSucceeds(p); n++; console.log('  allowed  ' + what); };
  const no = async (what, p) => { await assertFails(p); n++; console.log('  refused  ' + what); };

  console.log('Setting up a business');
  await ok('owner creates own business', setDoc(doc(owner, 'nk_biz/B1'), { owner: 'owner1', ownerEmail: 'owner@shop.in', rec: {} }));
  await ok('owner saves pointer to it', setDoc(doc(owner, 'nk_users/owner1'), { bizId: 'B1' }));
  await no('stranger creates a business in the owner\'s name', setDoc(doc(stranger, 'nk_biz/B9'), { owner: 'owner1' }));
  await no('person with unverified email creates a business', setDoc(doc(unverified, 'nk_biz/B8'), { owner: 'u9' }));
  await ok('second owner creates a separate business', setDoc(doc(otherOwner, 'nk_biz/B2'), { owner: 'owner2' }));
  await no('stranger takes over the business', updateDoc(doc(stranger, 'nk_biz/B1'), { owner: 'x1' }));
  await no('owner of another business reads this business', getDoc(doc(otherOwner, 'nk_biz/B1')));

  console.log('Staff list');
  await ok('owner adds full staff', setDoc(doc(owner, 'nk_biz/B1/members/staff@shop.in'), { email: 'staff@shop.in', entryOnly: false }));
  await ok('owner adds entry-only staff', setDoc(doc(owner, 'nk_biz/B1/members/entry@shop.in'), { email: 'entry@shop.in', entryOnly: true }));
  await ok('owner writes invite for staff', setDoc(doc(owner, 'nk_invites/staff@shop.in'), { bizId: 'B1' }));
  await no('stranger adds himself as staff', setDoc(doc(stranger, 'nk_biz/B1/members/stranger@else.in'), { email: 'stranger@else.in', entryOnly: false }));
  await no('staff adds another staff', setDoc(doc(staff, 'nk_biz/B1/members/friend@x.in'), { email: 'friend@x.in', entryOnly: false }));
  await no('entry-only staff makes himself full staff', updateDoc(doc(entry, 'nk_biz/B1/members/entry@shop.in'), { entryOnly: false }));
  await no('other owner invites into this business', setDoc(doc(otherOwner, 'nk_invites/spy@x.in'), { bizId: 'B1' }));
  await ok('staff reads own invite', getDoc(doc(staff, 'nk_invites/staff@shop.in')));
  await no('stranger reads someone else\'s invite', getDoc(doc(stranger, 'nk_invites/staff@shop.in')));
  await no('staff email not yet verified reads the business', getDoc(doc(unverified, 'nk_biz/B1')));
  await ok('staff reads the business', getDoc(doc(staff, 'nk_biz/B1')));
  await no('staff lists the staff list', getDocs(collection(staff, 'nk_biz/B1/members')));

  console.log('Business key requests');
  await ok('staff phone checks if it has already asked (nothing there yet)', getDoc(doc(staff, 'nk_biz/B1/keys/devS')));
  await no('stranger probes key requests', getDoc(doc(stranger, 'nk_biz/B1/keys/devS')));
  await ok('staff phone asks for the key', setDoc(doc(staff, 'nk_biz/B1/keys/devS'), { uid: 'staff1', email: 'staff@shop.in', pub: 'PUB', wrapped: null }));
  await no('staff phone approves itself', updateDoc(doc(staff, 'nk_biz/B1/keys/devS'), { wrapped: { ct: 'x' } }));
  await no('stranger asks for the key', setDoc(doc(stranger, 'nk_biz/B1/keys/devX'), { uid: 'x1', email: 'stranger@else.in', pub: 'P', wrapped: null }));
  await no('staff asks in another person\'s name', setDoc(doc(staff, 'nk_biz/B1/keys/devZ'), { uid: 'owner1', email: 'staff@shop.in', pub: 'P', wrapped: null }));
  await ok('owner sees waiting phones', getDocs(collection(owner, 'nk_biz/B1/keys')));
  await no('entry-only staff sees waiting phones', getDocs(collection(entry, 'nk_biz/B1/keys')));
  await ok('owner approves the phone', updateDoc(doc(owner, 'nk_biz/B1/keys/devS'), { wrapped: { epk: 'e', iv: 'i', ct: 'c' } }));
  await no('owner swaps the phone\'s public key while approving', updateDoc(doc(owner, 'nk_biz/B1/keys/devS'), { pub: 'OTHER' }));
  await ok('staff reads own approved key', getDoc(doc(staff, 'nk_biz/B1/keys/devS')));
  await no('entry-only staff reads another phone\'s key', getDoc(doc(entry, 'nk_biz/B1/keys/devS')));

  console.log('The book (bills, payments, parties, items)');
  await ok('owner adds a record', setDoc(doc(owner, 'nk_biz/B1/recs/r-owner'), rec('owner1')));
  await ok('staff adds a record', setDoc(doc(staff, 'nk_biz/B1/recs/r-staff'), rec('staff1')));
  await ok('entry-only staff adds a record', setDoc(doc(entry, 'nk_biz/B1/recs/r-entry'), rec('entry1')));
  await ok('owner reads the book', getDocs(collection(owner, 'nk_biz/B1/recs')));
  await ok('staff reads the book', getDocs(collection(staff, 'nk_biz/B1/recs')));
  await ok('entry-only staff reads the book', getDocs(collection(entry, 'nk_biz/B1/recs')));
  await no('stranger reads the book', getDocs(collection(stranger, 'nk_biz/B1/recs')));
  await no('owner of another business reads the book', getDocs(collection(otherOwner, 'nk_biz/B1/recs')));
  await no('not signed in reads the book', getDocs(collection(nobody, 'nk_biz/B1/recs')));
  await no('unverified email reads the book', getDocs(collection(unverified, 'nk_biz/B1/recs')));
  await no('stranger adds a record', setDoc(doc(stranger, 'nk_biz/B1/recs/r-x'), rec('x1')));
  await no('owner of another business adds a record', setDoc(doc(otherOwner, 'nk_biz/B1/recs/r-y'), rec('owner2')));
  await no('staff adds a record in the owner\'s name', setDoc(doc(staff, 'nk_biz/B1/recs/r-fake'), rec('owner1')));
  await ok('staff edits the owner\'s record', setDoc(doc(staff, 'nk_biz/B1/recs/r-owner'), rec('owner1')));
  await ok('staff deletes (marks deleted) the owner\'s record', setDoc(doc(staff, 'nk_biz/B1/recs/r-owner'), rec('owner1', true)));
  await ok('owner brings it back', setDoc(doc(owner, 'nk_biz/B1/recs/r-owner'), rec('owner1')));
  await ok('entry-only staff edits own record', setDoc(doc(entry, 'nk_biz/B1/recs/r-entry'), rec('entry1')));
  await ok('entry-only staff takes back own entry within 10 minutes (Undo)', setDoc(doc(entry, 'nk_biz/B1/recs/r-entry'), rec('entry1', true)));
  await no('entry-only staff edits the owner\'s record', setDoc(doc(entry, 'nk_biz/B1/recs/r-owner'), rec('owner1')));
  await no('entry-only staff deletes the owner\'s record', setDoc(doc(entry, 'nk_biz/B1/recs/r-owner'), rec('owner1', true)));
  await no('entry-only staff takes over the owner\'s record', setDoc(doc(entry, 'nk_biz/B1/recs/r-owner'), rec('entry1')));
  /* an entry older than 10 minutes cannot be deleted by entry-only staff */
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'nk_biz/B1/recs/r-old'), { c: 'x', iv: 'i', by: 'entry1', del: false, m: 1, u: new Date(Date.now() - 3600e3) }));
  await no('entry-only staff deletes own entry after 10 minutes', setDoc(doc(entry, 'nk_biz/B1/recs/r-old'), rec('entry1', true)));
  await ok('entry-only staff still corrects own old entry', setDoc(doc(entry, 'nk_biz/B1/recs/r-old'), rec('entry1')));
  await no('anyone erases a record from the server for ever', deleteDoc(doc(owner, 'nk_biz/B1/recs/r-owner')));
  await no('record saved with a made-up time', setDoc(doc(owner, 'nk_biz/B1/recs/r-time'), { c: 'x', iv: 'i', by: 'owner1', del: false, m: 1, u: new Date(2020, 1, 1) }));

  console.log('Removing staff');
  await ok('owner removes staff', deleteDoc(doc(owner, 'nk_biz/B1/members/staff@shop.in')));
  await ok('owner removes that staff\'s key', deleteDoc(doc(owner, 'nk_biz/B1/keys/devS')));
  await no('removed staff reads the book', getDocs(collection(staff, 'nk_biz/B1/recs')));
  await no('removed staff adds a record', setDoc(doc(staff, 'nk_biz/B1/recs/r-late'), rec('staff1')));
  await no('removed staff asks for the key again', setDoc(doc(staff, 'nk_biz/B1/keys/devS2'), { uid: 'staff1', email: 'staff@shop.in', pub: 'P', wrapped: null }));
  await no('staff of business 1 reads business 2', getDocs(collection(entry, 'nk_biz/B2/recs')));
  await no('anyone reads another person\'s owner pointer', getDoc(doc(entry, 'nk_users/owner1')));

  await env.cleanup();
  console.log('ALL ' + n + ' RULE CHECKS PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
