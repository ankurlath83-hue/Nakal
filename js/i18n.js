/* WORDS: every label and message in English and Hindi.
   Hindi uses the words shopkeepers really say (jama, baaki, khata), not textbook words. */
(function (NK) {
  'use strict';
  NK.lang = 'en';
  /* key: [English, Hindi] */
  var W = NK.words = {
    tab_bill: ['Bill', 'बिल'], tab_ledger: ['Ledger', 'खाता'], tab_parties: ['Parties', 'पार्टी'], tab_items: ['Items', 'माल'], tab_more: ['More', 'और'],
    st_local: ['Saved on this phone', 'इस फ़ोन में सेव है'], st_synced: ['Synced', 'सिंक हो गया'], st_offline: ['No internet', 'नेट नहीं है'], st_saving: ['Syncing…', 'सिंक हो रहा है…'],
    next: ['Next', 'आगे'], space: ['space', 'स्पेस'], save: ['Save', 'सेव'], cancel: ['Cancel', 'रहने दो'], delete: ['Delete', 'हटाओ'], edit: ['Edit', 'बदलो'], add: ['Add', 'जोड़ो'], remove: ['Remove', 'हटाओ'],
    undo: ['Undo', 'वापस लो'], undone: ['Taken back.', 'वापस ले लिया।'], done: ['Done', 'ठीक है'], today: ['Today', 'आज'], yesterday: ['Yesterday', 'कल'], clear: ['Clear', 'साफ़ करो'], saved: ['Saved.', 'सेव हो गया।'],
    share: ['Share', 'भेजो'], show: ['Show', 'दिखाओ'], hide: ['Hide', 'छुपाओ'], skip: ['Skip', 'छोड़ो'], start: ['Start', 'शुरू करो'], date: ['Date', 'तारीख'], note: ['Note', 'नोट'],

    new_bill: ['New bill', 'नया बिल'], edit_bill: ['Bill', 'बिल'], bill: ['Bill', 'बिल'], paid: ['Paid', 'जमा'],
    party_name: ['Party name', 'पार्टी का नाम'], item: ['Item', 'माल'], rate: ['Rate', 'भाव'], qty: ['Qty', 'नग'], amount: ['Amount', 'रकम'], unit: ['Unit', 'यूनिट'],
    add_item: ['Add item', 'माल जोड़ो'], sub_total: ['Sub total', 'जोड़'], transport: ['Transport', 'भाड़ा'], grand_total: ['Grand total', 'कुल रकम'],
    delete_bill: ['Delete bill', 'बिल हटाओ'], need_party: ['Type the party name first.', 'पहले पार्टी का नाम लिखो।'], need_item: ['Add at least one item with rate and qty.', 'कम से कम एक माल, भाव और नग लिखो।'],
    need_amount: ['Type the amount first.', 'पहले रकम लिखो।'],
    bill_saved: ['Bill #{no} saved.', 'बिल #{no} सेव हो गया।'], saved_offline: ['No internet. Bill #{no} is saved on this phone and will sync later.', 'नेट नहीं है। बिल #{no} इस फ़ोन में सेव है, बाद में सिंक होगा।'],
    on_phone: ['Saved on this phone; it will sync later.', 'इस फ़ोन में सेव है, बाद में सिंक होगा।'],
    bill_deleted: ['Bill deleted.', 'बिल हट गया।'], ask_del_bill: ['Delete bill #{no}? It will also go from the party\'s ledger.', 'बिल #{no} हटाना है? यह पार्टी के खाते से भी हट जाएगा।'],
    not_allowed: ['You are not allowed to change this. Ask the owner.', 'आप इसे नहीं बदल सकते। मालिक से कहो।'],
    share_wa: ['Send on WhatsApp', 'WhatsApp पर भेजो'], share_img: ['Photo', 'फ़ोटो'], share_pdf: ['PDF', 'PDF'], share_chart: ['Send rate chart', 'भाव लिस्ट भेजो'],
    tip1: ['1. Type the party name.', '1. पार्टी का नाम लिखो।'], tip2: ['2. Type item, rate and qty. Press Next after each.', '2. माल, भाव और नग लिखो। हर बार आगे दबाओ।'], tip3: ['3. Press Save, then send on WhatsApp.', '3. सेव दबाओ, फिर WhatsApp पर भेजो।'],
    all_bills: ['All bills', 'सारे बिल'], search_bills: ['Search party, bill no or item', 'पार्टी, बिल नंबर या माल खोजो'], nothing_found: ['Nothing found. Try another word.', 'कुछ नहीं मिला। दूसरा शब्द लिखो।'],
    no_bills: ['No bills yet. Make your first bill from the Bill tab.', 'अभी कोई बिल नहीं है। बिल टैब से पहला बिल बनाओ।'], items_n: ['items', 'माल'], bills_n: ['bills', 'बिल'],

    to_receive: ['To receive', 'बाकी लेना'], advance: ['Advance', 'एडवांस'], settled: ['Settled', 'हिसाब बराबर'],
    pick_party: ['Type a party name to open its ledger.', 'खाता खोलने के लिए पार्टी का नाम लिखो।'], new_party_hint: ['New party. Type an amount and press Paid or Bill to start its ledger.', 'नई पार्टी। रकम लिखो और जमा या बिल दबाओ, खाता शुरू हो जाएगा।'],
    q_cash: ['Cash', 'नकद'], q_upi: ['UPI', 'UPI'], q_cheque: ['Cheque', 'चेक'], q_bank: ['Bank', 'बैंक'],
    paid_saved: ['Paid {amt} saved.', 'जमा {amt} सेव हो गया।'], billentry_saved: ['Bill {amt} saved.', 'बिल {amt} सेव हो गया।'], entry_deleted: ['Entry deleted.', 'एंट्री हट गई।'],

    total_to_receive: ['Total to receive', 'कुल बाकी लेना'], no_parties: ['No parties yet. They are added by themselves when you make a bill.', 'अभी कोई पार्टी नहीं है। बिल बनाते ही पार्टी जुड़ जाती है।'],
    last_paid: ['Last paid', 'आख़िरी जमा'], last_bill: ['Last bill', 'आख़िरी बिल'], days_late: ['{n} days late', '{n} दिन लेट'],
    remind: ['Remind', 'तकादा'], statement: ['Statement', 'खाता नकल'], add_party: ['Add party', 'पार्टी जोड़ो'], edit_party: ['Edit party', 'पार्टी बदलो'],
    nothing_due: ['Nothing to receive from this party.', 'इस पार्टी से कुछ लेना बाकी नहीं है।'], phone10: ['Mobile number (10 digits)', 'मोबाइल नंबर (10 अंक)'], phone_bad: ['Mobile number must be 10 digits.', 'मोबाइल नंबर 10 अंक का होना चाहिए।'],
    credit_days: ['Credit days', 'उधार के दिन'], default_is: ['normally {n}', 'वैसे {n}'], party_exists: ['A party with this name is already there.', 'इस नाम की पार्टी पहले से है।'], party_deleted: ['Party deleted.', 'पार्टी हट गई।'],
    remind_text: ['Namaste {name}, your balance with {biz} is {amt} as on {date}.', 'नमस्ते {name}, {biz} में आपका {amt} बाकी है ({date} तक)।'], remind_late: ['It is {n} days late.', 'यह {n} दिन लेट है।'], remind_end: ['Please pay soon. Thank you.', 'कृपया जल्दी जमा करें। धन्यवाद।'],
    total_bill: ['Total bill', 'कुल बिल'], total_paid: ['Total paid', 'कुल जमा'], older_n: ['{n} older entries not shown', '{n} पुरानी एंट्री नहीं दिखाई'],

    search_items: ['Search item', 'माल खोजो'], no_items: ['No items yet. Items you type in a bill are added here by themselves.', 'अभी कोई माल नहीं है। बिल में लिखा माल यहाँ अपने आप जुड़ जाता है।'],
    edit_item: ['Edit item', 'माल बदलो'], item_exists: ['An item with this name is already there.', 'इस नाम का माल पहले से है।'], item_deleted: ['Item deleted.', 'माल हट गया।'], rate_chart: ['Rate chart', 'भाव लिस्ट'],

    item_sales: ['Item sales', 'माल की बिक्री'], item_sales_sub: ['Which item sold how much', 'कौन सा माल कितना बिका'], per_month: ['This month', 'इस महीने'], per_last: ['Last month', 'पिछले महीने'], per_fy: ['This year (Apr–Mar)', 'इस साल (अप्रैल–मार्च)'], per_all: ['All time', 'शुरू से'],
    total_sales: ['Total sales', 'कुल बिक्री'], no_sales: ['No bills in this period.', 'इस समय में कोई बिल नहीं है।'], avg: ['avg', 'औसत'],

    cash_counter: ['Cash counter', 'नोट गिनती'], cash_sub: ['Count cash by note', 'नोट के हिसाब से नकद गिनो'], total_cash: ['Total cash', 'कुल नकद'],
    exports: ['Export to Excel (CSV)', 'Excel में निकालो (CSV)'], exports_sub: ['Ledger, bills, item sales', 'खाता, बिल, माल की बिक्री'], exports_hint: ['These files open in Excel. Keep them safe; they are not locked.', 'ये फ़ाइलें Excel में खुलती हैं। संभाल कर रखो, इन पर ताला नहीं है।'],
    csv_ledger: ['Ledger of all parties', 'सब पार्टी का खाता'], csv_bills: ['All bills', 'सारे बिल'], csv_items: ['Item sales', 'माल की बिक्री'],
    backup: ['Backup and restore', 'बैकअप और वापसी'], backup_sub: ['Locked file of your whole book', 'पूरे खाते की ताले वाली फ़ाइल'],
    backup_hint: ['A backup is one locked file with your whole book. Keep it in WhatsApp, Drive or email. Only your backup password can open it.', 'बैकअप एक ताले वाली फ़ाइल है जिसमें पूरा खाता है। इसे WhatsApp, Drive या ईमेल में रखो। सिर्फ़ बैकअप पासवर्ड से खुलती है।'],
    backup_make: ['Make backup', 'बैकअप बनाओ'], backup_restore: ['Restore from file', 'फ़ाइल से वापस लाओ'], backup_pass: ['Backup password', 'बैकअप पासवर्ड'],
    backup_pass_hint: ['At least 8 letters or numbers. Write it down. Without it nobody, not even we, can open the backup.', 'कम से कम 8 अक्षर या अंक। लिख कर रखो। इसके बिना कोई भी, हम भी, बैकअप नहीं खोल सकते।'],
    backup_done: ['Backup is ready. Save or send the file.', 'बैकअप तैयार है। फ़ाइल सेव करो या भेजो।'], restore_pass: ['Password of this backup', 'इस बैकअप का पासवर्ड'],
    restore_done: ['Restored. {n} entries were added or updated.', 'वापस आ गया। {n} एंट्री जुड़ीं या बदलीं।'], restore_wrong: ['Wrong password. Try again.', 'पासवर्ड गलत है। फिर से लिखो।'], restore_notfile: ['This is not a backup file of this app. Pick the right file.', 'यह इस ऐप की बैकअप फ़ाइल नहीं है। सही फ़ाइल चुनो।'],
    erase_title: ['Erase this phone', 'इस फ़ोन से सब मिटाओ'], erase_hint: ['Removes the whole book and the PIN from this phone only. Make a backup first.', 'सिर्फ़ इस फ़ोन से पूरा खाता और PIN मिटाता है। पहले बैकअप बना लो।'],
    erase_pin: ['Type your PIN to erase.', 'मिटाने के लिए PIN लिखो।'], erase_btn: ['Erase everything', 'सब मिटाओ'], erase_sure: ['Tap again to erase for ever', 'हमेशा के लिए मिटाने को फिर दबाओ'],

    settings: ['Settings', 'सेटिंग'], biz_name: ['Business name', 'दुकान का नाम'], language: ['Language', 'भाषा'], theme: ['Look', 'रंग'], theme_auto: ['Same as phone', 'फ़ोन जैसा'], theme_light: ['Light', 'उजाला'], theme_dark: ['Dark', 'अंधेरा'],
    def_credit: ['Credit days for all parties', 'सब पार्टी के उधार के दिन'], autolock: ['Lock when not used for', 'इतनी देर न चले तो ताला'], min: ['min', 'मिनट'],
    change_pin: ['Change PIN', 'PIN बदलो'], pin_old: ['Old PIN', 'पुराना PIN'], pin_new: ['New PIN (6 digits)', 'नया PIN (6 अंक)'], pin_again: ['Same PIN again', 'वही PIN फिर से'], pin_changed: ['PIN changed.', 'PIN बदल गया।'],
    pin_forget: ['If you forget the PIN, nobody can open this phone\'s book, not even we. You will have to erase the phone and bring the book back from online sync or from a backup file. Write the PIN down.', 'PIN भूल गए तो इस फ़ोन का खाता कोई नहीं खोल सकता, हम भी नहीं। फ़ोन मिटाकर खाता ऑनलाइन सिंक या बैकअप फ़ाइल से वापस लाना पड़ेगा। PIN लिख कर रखो।'],
    bio_on: ['Turn on fingerprint', 'फ़िंगरप्रिंट चालू करो'], bio_off: ['Turn off fingerprint', 'फ़िंगरप्रिंट बंद करो'], bio_ok: ['Fingerprint is on.', 'फ़िंगरप्रिंट चालू हो गया।'], bio_fail: ['Fingerprint did not work. Use the PIN.', 'फ़िंगरप्रिंट नहीं चला। PIN लिखो।'],
    lock_now: ['Lock now', 'अभी ताला लगाओ'], about: ['Safety of your data', 'आपके डेटा की सुरक्षा'], about_sub: ['What is protected and what is not', 'क्या सुरक्षित है और क्या नहीं'],
    no_ads: ['No ads, no trackers.', 'न विज्ञापन, न ट्रैकर।'],

    enter_pin: ['Enter PIN', 'PIN लिखो'], pin_wrong: ['Wrong PIN.', 'PIN गलत है।'], pin_wrong_left: ['Wrong PIN. {n} tries left before a wait.', 'PIN गलत है। {n} बार और, फिर रुकना पड़ेगा।'], pin_wait: ['Too many wrong tries. Wait {s} seconds.', 'बहुत बार गलत PIN। {s} सेकंड रुको।'],
    use_finger: ['Use fingerprint', 'फ़िंगरप्रिंट लगाओ'], forgot_pin: ['Forgot PIN?', 'PIN भूल गए?'],
    forgot_text: ['The PIN cannot be recovered. You can erase this phone and start again. If online sync was on, sign in again and your book comes back (the owner needs the recovery code). If not, restore from a backup file.', 'PIN वापस नहीं मिल सकता। आप इस फ़ोन को मिटाकर फिर शुरू कर सकते हैं। ऑनलाइन सिंक चालू था तो फिर से साइन इन करो, खाता वापस आ जाएगा (मालिक को रिकवरी कोड चाहिए)। नहीं था तो बैकअप फ़ाइल से वापस लाओ।'],
    ob1_title: ['Name of your business', 'आपकी दुकान का नाम'], ob1_hint: ['It will show on your bills.', 'यह आपके बिल पर दिखेगा।'],
    ob2_title: ['Choose a 6-digit PIN', '6 अंक का PIN चुनो'], ob2_hint: ['The PIN locks your book on this phone.', 'PIN इस फ़ोन में आपके खाते पर ताला लगाता है।'], set_pin: ['Set PIN', 'PIN लगाओ'],
    ob3_title: ['Your first party', 'आपकी पहली पार्टी'], ob3_hint: ['A customer you sell to. You can skip this.', 'जिस ग्राहक को माल बेचते हो। चाहो तो छोड़ दो।'],

    online: ['Online and staff', 'ऑनलाइन और स्टाफ़'], on_unavail: ['Online sync is not set up in this copy of the app. Your book is saved on this phone.', 'इस ऐप में ऑनलाइन सिंक चालू नहीं है। आपका खाता इस फ़ोन में सेव है।'],
    on_intro: ['Sign in to see the same book on all your phones and to add staff. The app works without this too.', 'सब फ़ोन में एक ही खाता देखने और स्टाफ़ जोड़ने के लिए साइन इन करो। इसके बिना भी ऐप चलता है।'],
    checking: ['Checking…', 'देख रहे हैं…'], email: ['Email', 'ईमेल'], password: ['Password (8 or more)', 'पासवर्ड (8 या ज़्यादा)'], sign_in: ['Sign in', 'साइन इन'], create_acc: ['Create account', 'नया खाता बनाओ'], forgot_pw: ['Forgot password', 'पासवर्ड भूल गए'], sign_out: ['Sign out', 'साइन आउट'],
    need_login: ['Type your email and password.', 'ईमेल और पासवर्ड लिखो।'], need_email: ['Type your email first.', 'पहले ईमेल लिखो।'], reset_sent: ['Check your email for a link to set a new password.', 'नया पासवर्ड बनाने का लिंक आपके ईमेल में है।'],
    verify_msg: ['We sent a link to {email}. Open the link, then press Check again.', '{email} पर एक लिंक भेजा है। लिंक खोलो, फिर "फिर देखो" दबाओ।'], check_again: ['Check again', 'फिर देखो'], send_again: ['Send the link again', 'लिंक फिर भेजो'], verify_sent: ['Link sent. Check your email.', 'लिंक भेज दिया। ईमेल देखो।'], not_verified: ['Not confirmed yet. Open the link in your email first.', 'अभी पक्का नहीं हुआ। पहले ईमेल का लिंक खोलो।'],
    iam_owner: ['I am the owner', 'मैं मालिक हूँ'], owner_hint: ['Puts this phone\'s book online, locked with a key only you and your approved staff hold.', 'इस फ़ोन का खाता ऑनलाइन रखता है, ऐसी चाबी से बंद जो सिर्फ़ आपके और आपके मंज़ूर स्टाफ़ के पास है।'], start_sync: ['Start online sync', 'ऑनलाइन सिंक शुरू करो'],
    iam_staff: ['I am staff', 'मैं स्टाफ़ हूँ'], staff_hint: ['Ask the owner to add {email} under Staff. Then press Check again.', 'मालिक से कहो कि स्टाफ़ में {email} जोड़ें। फिर "फिर देखो" दबाओ।'],
    key_owner: ['This phone needs your business key. Type your recovery code, or approve this code on your other phone:', 'इस फ़ोन को दुकान की चाबी चाहिए। रिकवरी कोड लिखो, या अपने दूसरे फ़ोन पर यह कोड मंज़ूर करो:'],
    key_staff: ['Ask the owner to approve this phone. Tell the owner this code:', 'मालिक से इस फ़ोन को मंज़ूर करने को कहो। मालिक को यह कोड बताओ:'],
    rec_code: ['Recovery code', 'रिकवरी कोड'], use_code: ['Open with this code', 'इस कोड से खोलो'], rec_wrong: ['This recovery code is not right. Check and type again.', 'रिकवरी कोड सही नहीं है। देख कर फिर लिखो।'],
    rec_title: ['Your recovery code', 'आपका रिकवरी कोड'], rec_msg: ['Write this in your notebook now. You need it to open your book on a new phone, or if you forget the PIN. We do not have it and cannot give it again.', 'इसे अभी अपनी कॉपी में लिख लो। नए फ़ोन पर खाता खोलने या PIN भूलने पर यही काम आएगा। यह हमारे पास नहीं है, दोबारा नहीं मिलेगा।'], rec_done: ['I have written it down', 'मैंने लिख लिया'],
    removed_msg: ['The owner has removed your access. New entries will stay on this phone only.', 'मालिक ने आपकी पहुँच हटा दी है। नई एंट्री सिर्फ़ इस फ़ोन में रहेंगी।'],
    role_owner: ['Owner', 'मालिक'], role_staff: ['Staff', 'स्टाफ़'], role_entry: ['Staff (entry only)', 'स्टाफ़ (सिर्फ़ एंट्री)'], role_none: ['', ''],
    approve_title: ['Phones waiting for approval', 'मंज़ूरी के लिए रुके फ़ोन'], approve_hint: ['Approve only if this code is the same as on that person\'s phone.', 'तभी मंज़ूर करो जब यह कोड उस आदमी के फ़ोन वाले कोड से मिलता हो।'], approve: ['Approve', 'मंज़ूर'], reject: ['Reject', 'मना करो'], approved: ['Approved. That phone will open in a few seconds.', 'मंज़ूर। वह फ़ोन कुछ सेकंड में खुल जाएगा।'],
    staff: ['Staff', 'स्टाफ़'], no_staff: ['No staff added yet.', 'अभी कोई स्टाफ़ नहीं जोड़ा।'], add_staff: ['Add staff by email', 'ईमेल से स्टाफ़ जोड़ो'], entry_only: ['Entry only', 'सिर्फ़ एंट्री'], entry_hint: ['Entry only: can add bills and payments, cannot delete or export.', 'सिर्फ़ एंट्री: बिल और जमा जोड़ सकता है, हटा या निकाल नहीं सकता।'],
    staff_added: ['Staff added. Ask them to create an account with this email.', 'स्टाफ़ जुड़ गया। उनसे कहो इसी ईमेल से खाता बनाएँ।'], staff_removed: ['Staff removed.', 'स्टाफ़ हट गया।'], ask_remove: ['Remove {email}? They will not get any new entries.', '{email} को हटाना है? उन्हें नई एंट्री नहीं मिलेंगी।'],
    import_old: ['Bring bills from old Nakal', 'पुराने Nakal के बिल लाओ'], import_done: ['{n} old bills brought in.', '{n} पुराने बिल आ गए।'],
    e_email: ['This email does not look right.', 'ईमेल सही नहीं लग रहा।'], e_login: ['Email or password is wrong.', 'ईमेल या पासवर्ड गलत है।'], e_exists: ['This email already has an account. Press Sign in.', 'इस ईमेल का खाता पहले से है। साइन इन दबाओ।'], e_weak: ['Password must be 8 or more letters or numbers.', 'पासवर्ड 8 या ज़्यादा अक्षर या अंक का हो।'],
    e_net: ['No internet. Your book is safe on this phone. Try again later.', 'नेट नहीं है। आपका खाता इस फ़ोन में सुरक्षित है। बाद में फिर करो।'], e_many: ['Too many tries. Wait a few minutes and try again.', 'बहुत बार कोशिश हुई। कुछ मिनट रुक कर फिर करो।'],
    e_denied: ['Not allowed. Ask the owner to check your access.', 'इजाज़त नहीं है। मालिक से अपनी पहुँच देखने को कहो।'], e_other: ['That did not work. Try again.', 'यह नहीं हुआ। फिर से करो।'],

    prot_yes: ['What is protected', 'क्या सुरक्षित है'],
    py1: ['Your book on this phone is locked with AES-256 encryption. The key is made from your PIN and is never stored.', 'इस फ़ोन में आपका खाता AES-256 ताले में है। चाबी आपके PIN से बनती है और कहीं रखी नहीं जाती।'],
    py2: ['The app locks itself when not used, and wrong PIN tries are slowed down.', 'ऐप न चले तो अपने आप ताला लगता है, और गलत PIN पर रुकना पड़ता है।'],
    py3: ['Before anything goes online it is locked with your business key. The server stores only scrambled text.', 'ऑनलाइन जाने से पहले सब कुछ दुकान की चाबी से बंद होता है। सर्वर पर सिर्फ़ उलझा हुआ टेक्स्ट रहता है।'],
    py4: ['Only you and staff phones you approve get the business key.', 'दुकान की चाबी सिर्फ़ आपको और आपके मंज़ूर किए स्टाफ़ फ़ोन को मिलती है।'],
    py5: ['Backup files are locked with your backup password. No ads, no trackers, no analytics.', 'बैकअप फ़ाइल आपके बैकअप पासवर्ड से बंद रहती है। न विज्ञापन, न ट्रैकर।'],
    prot_no: ['What is not protected', 'क्या सुरक्षित नहीं है'],
    pn1: ['A 6-digit PIN is short. Someone skilled who copies this phone\'s storage can try all PINs on a computer in days or less.', '6 अंक का PIN छोटा है। कोई जानकार इस फ़ोन का डेटा कॉपी कर ले तो कंप्यूटर पर कुछ दिनों में सारे PIN आज़मा सकता है।'],
    pn2: ['While the app is open and unlocked, anyone holding the phone can see everything.', 'ऐप खुला हो तो फ़ोन हाथ में लेने वाला सब देख सकता है।'],
    pn3: ['Bills, photos, PDFs and CSV files you share are plain. Anyone who gets them can read them.', 'जो बिल, फ़ोटो, PDF और CSV आप भेजते हो उन पर ताला नहीं है। जिसे मिलें वह पढ़ सकता है।'],
    pn4: ['A removed staff member keeps what was already on their phone. "Entry only" hides export in the app but cannot stop screenshots.', 'हटाए गए स्टाफ़ के फ़ोन में पहले का डेटा रह जाता है। "सिर्फ़ एंट्री" ऐप में निकालना छुपाता है, स्क्रीनशॉट नहीं रोक सकता।'],
    pn5: ['The server can see your email, staff emails, how many entries there are and when they change, but not what they say.', 'सर्वर आपका ईमेल, स्टाफ़ के ईमेल, एंट्री की गिनती और समय देख सकता है, पर उनमें क्या लिखा है वह नहीं।'],
    pn6: ['A phone with a virus, or a forgotten PIN, recovery code or backup password, is outside what the app can fix.', 'वायरस वाला फ़ोन, या भूला हुआ PIN, रिकवरी कोड या बैकअप पासवर्ड, ऐप ठीक नहीं कर सकता।']
  };
  /* t('bill_saved', {no: 12}) -> "Bill #12 saved." in the current language. */
  NK.t = function (k, vars) {
    var w = W[k]; if (!w) { (NK.missing = NK.missing || {})[k] = 1; return '⚠' + k; }
    var s = w[NK.lang === 'hi' ? 1 : 0];
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
    return s;
  };
})(globalThis.NK = globalThis.NK || {});
