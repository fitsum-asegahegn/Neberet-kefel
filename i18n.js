/* i18n.js — AM/EN dictionary + t() helper + language toggle */
(function (global) {
  const DICT = {
    app_title: { am: 'የንብረትና ሂሳብ ቁጥጥር ክፍል', en: 'Property & Accounts Control' },
    nav_dashboard: { am: 'ዳሽቦርድ', en: 'Dashboard' },
    nav_assets: { am: 'ንብረት', en: 'Assets' },
    nav_finance: { am: 'ገቢና ወጪ', en: 'Income & Expense' },
    nav_repairs: { am: 'ጥገና', en: 'Repairs' },
    nav_contrib: { am: 'መዋጮ', en: 'Contributions' },
    nav_plan: { am: 'ዕቅድ', en: 'Plan' },
    nav_settings: { am: 'ቅንብር', en: 'Settings' },

    today_ec: { am: 'የዛሬ ቀን', en: "Today" },
    upcoming_due: { am: 'በቅርቡ የሚደርሱ', en: 'Coming up' },
    not_deposited: { am: 'ገና ወደ ባንክ ያልገባ ገቢ', en: 'Not yet deposited' },
    pending_repairs: { am: 'ያልተጠናቀቁ ጥገናዎች', en: 'Pending repairs' },
    asset_count_due: { am: 'የንብረት ቆጠራ ጊዜ', en: 'Asset count due' },

    add_new: { am: '+ አዲስ ጨምር', en: '+ Add new' },
    save: { am: 'አስቀምጥ', en: 'Save' },
    cancel: { am: 'ይቅር', en: 'Cancel' },
    edit: { am: 'አርም', en: 'Edit' },
    delete: { am: 'ሰርዝ', en: 'Delete' },
    search: { am: 'ፈልግ...', en: 'Search...' },
    export_excel: { am: '⬇ ወደ Excel ላክ', en: '⬇ Export Excel' },
    import_excel: { am: '⬆ ከExcel አስገባ', en: '⬆ Import Excel' },
    print: { am: '🖨 አትም', en: '🖨 Print' },
    close: { am: 'ዝጋ', en: 'Close' },
    confirm_delete: { am: 'እርግጠኛ ነዎት መሰረዝ ይፈልጋሉ?', en: 'Delete this item?' },
    no_records: { am: 'ምንም መረጃ የለም', en: 'No records yet' },
    yes: { am: 'አዎ', en: 'Yes' },
    no: { am: 'አይ', en: 'No' },

    // Assets
    asset_code: { am: 'ኮድ', en: 'Code' },
    asset_name: { am: 'የንብረት ስም', en: 'Asset name' },
    asset_category: { am: 'ምድብ', en: 'Category' },
    asset_source: { am: 'ምንጭ', en: 'Source' },
    asset_source_purchase: { am: 'በግዢ', en: 'Purchase' },
    asset_source_gift: { am: 'በስጦታ', en: 'Gift' },
    asset_date_received: { am: 'የገባበት ቀን', en: 'Date received' },
    asset_status: { am: 'ሁኔታ', en: 'Status' },
    asset_status_active: { am: 'አገልግሎት ላይ', en: 'In use' },
    asset_status_damaged: { am: 'ተጎድቷል', en: 'Damaged' },
    asset_status_repair: { am: 'ጥገና ላይ', en: 'In repair' },
    asset_status_disposed: { am: 'ወጪ ሆኗል', en: 'Disposed' },
    asset_location: { am: 'የሚገኝበት ቦታ', en: 'Location' },
    asset_notes: { am: 'ማስታወሻ', en: 'Notes' },
    asset_letter_ref: { am: 'የደብዳቤ ቁጥር', en: 'Letter ref.' },
    asset_registry: { am: 'የንብረት መዝገብ', en: 'Asset registry' },
    run_count: { am: '📋 ቆጠራ ጀምር', en: '📋 Start count' },
    count_history: { am: 'የቆጠራ ታሪክ', en: 'Count history' },
    count_expected: { am: 'የተመዘገበ', en: 'On record' },
    count_found: { am: 'የተገኘ', en: 'Found' },
    count_match: { am: 'ትክክል', en: 'Match' },
    count_mismatch: { am: 'አለመመሳሰል', en: 'Mismatch' },
    count_finish: { am: 'ቆጠራ ጨርስ', en: 'Finish count' },
    counted_by: { am: 'የቆጠረው', en: 'Counted by' },

    // Finance
    income: { am: 'ገቢ', en: 'Income' },
    expense: { am: 'ወጪ', en: 'Expense' },
    amount: { am: 'መጠን (ብር)', en: 'Amount (ETB)' },
    date: { am: 'ቀን', en: 'Date' },
    income_source: { am: 'የገቢ ምንጭ', en: 'Income source' },
    income_source_holiday: { am: 'የበዓል መዋጮ (እንቁጣጣሽ/መስቀል)', en: 'Holiday collection' },
    income_source_subunit: { am: 'ከንዑስ ክፍል', en: 'From sub-unit' },
    income_source_development: { am: 'ከልማት ክፍል', en: 'From Development dept.' },
    income_source_other: { am: 'ሌላ', en: 'Other' },
    deposited: { am: 'ወደ ባንክ ገብቷል?', en: 'Deposited to bank?' },
    deposit_date: { am: 'የገባበት ቀን', en: 'Deposit date' },
    receipt_to: { am: 'ደረሰኝ ለ', en: 'Receipt issued to' },
    expense_purpose: { am: 'የወጪው ዓላማ', en: 'Purpose' },
    authorized_by: { am: 'የፈቀደው', en: 'Authorized by' },
    signature_confirmed: { am: 'ፊርማ ተረጋግጧል?', en: 'Signature confirmed?' },
    reconciled: { am: 'ሂሳብ ተወራርዷል?', en: 'Reconciled?' },
    recorded_by: { am: 'የመዘገበው', en: 'Recorded by' },
    total_income: { am: 'ጠቅላላ ገቢ', en: 'Total income' },
    total_expense: { am: 'ጠቅላላ ወጪ', en: 'Total expense' },
    balance: { am: 'ቀሪ ሂሳብ', en: 'Balance' },
    undeposited_amount: { am: 'ያልገባ መጠን', en: 'Undeposited amount' },

    // Repairs
    repair_item: { am: 'የተበላሸ ንብረት', en: 'Damaged item' },
    repair_desc: { am: 'የብልሽት መግለጫ', en: 'Description' },
    repair_reported: { am: 'የተመዘገበበት ቀን', en: 'Date reported' },
    repair_assignee: { am: 'ጥገና የሚያደርገው', en: 'Assigned to' },
    repair_volunteer: { am: 'በበጎ ፈቃደኝነት?', en: 'Volunteer?' },
    repair_cost: { am: 'ወጪ (ብር)', en: 'Cost (ETB)' },
    repair_status: { am: 'ደረጃ', en: 'Status' },
    repair_status_pending: { am: 'አልተጀመረም', en: 'Pending' },
    repair_status_progress: { am: 'በሂደት ላይ', en: 'In progress' },
    repair_status_done: { am: 'ተጠናቋል', en: 'Done' },
    repair_resolved_date: { am: 'የተጠናቀቀበት ቀን', en: 'Resolved date' },

    // Contributions
    contrib_period: { am: 'ወቅት/ዙር', en: 'Period / round' },
    contrib_leader: { am: 'የመሪ ስም', en: 'Leader name' },
    contrib_expected: { am: 'የሚጠበቅ መጠን', en: 'Expected amount' },
    contrib_paid: { am: 'የተከፈለ መጠን', en: 'Amount paid' },
    contrib_date_paid: { am: 'የተከፈለበት ቀን', en: 'Date paid' },
    contrib_collected_by: { am: 'የሰበሰበው', en: 'Collected by' },
    contrib_status_paid: { am: 'ተከፍሏል', en: 'Paid' },
    contrib_status_unpaid: { am: 'አልተከፈለም', en: 'Unpaid' },
    contrib_status_partial: { am: 'በከፊል', en: 'Partial' },

    // Plan
    plan_no: { am: 'ተ.ቁ', en: 'No.' },
    plan_subunit: { am: 'ንዑስ ክፍል', en: 'Sub-unit' },
    plan_title: { am: 'ዕቅድ/ፕሮጀክት', en: 'Plan item' },
    plan_details: { am: 'የክንውን ዝርዝር', en: 'Details' },
    plan_outcome: { am: 'ውጤት', en: 'Outcome' },
    plan_indicator: { am: 'አመልካች', en: 'Indicator' },
    plan_target: { am: 'መለኪያ', en: 'Target' },
    plan_timing: { am: 'የክንውን ጊዜ', en: 'Timing' },
    plan_executor: { am: 'ፈጻሚ አካል', en: 'Executor' },
    plan_budget: { am: 'በጀት', en: 'Budget' },
    plan_weight: { am: 'ክብደት', en: 'Weight' },
    plan_next_due: { am: 'ቀጣይ ጊዜ', en: 'Next due' },
    plan_mark_done: { am: 'ተከናውኗል ✓', en: 'Mark done ✓' },
    plan_done_note: { am: 'የክንውን ማስታወሻ', en: 'Completion note' },
    plan_history: { am: 'የክንውን ታሪክ', en: 'History' },
    plan_reset: { am: 'ወደ መጀመሪያው ዕቅድ መልስ', en: 'Reset to original plan' },
    plan_status_on_track: { am: 'እንደታቀደ እየሄደ ነው', en: 'On track' },
    plan_status_needs_attn: { am: 'ትኩረት ይፈልጋል', en: 'Needs attention' },
    plan_status_done: { am: 'ተጠናቋል', en: 'Done' },
    plan_status_manual: { am: 'በእጅ ክትትል', en: 'Manual tracking' },
    generate_report: { am: '🖨 ሪፖርት አመንጭ', en: '🖨 Generate report' },
    generate_pptx: { am: '📊 PowerPoint አመንጭ', en: '📊 Generate PowerPoint' },
    report_period: { am: 'የሪፖርት ጊዜ', en: 'Report period' },
    admin_only_note: { am: 'ይህ ክፍል ለ አስተዳዳሪዎች ብቻ ነው', en: 'This section is admin-only' },

    // Settings
    language: { am: 'ቋንቋ', en: 'Language' },
    settings_supabase: { am: '☁️ የSupabase ግንኙነት', en: '☁️ Supabase connection' },
    settings_sync_now: { am: '🔄 አሁን አመሳስል', en: '🔄 Sync now' },
    settings_display_name: { am: 'የሚታይ ስም', en: 'Display name' },
    settings_offline_only: { am: 'ከመስመር ውጪ ብቻ (Skip)', en: 'Skip — offline only' },
    settings_signed_in_as: { am: 'ገብተዋል እንደ', en: 'Signed in as' },
    settings_sign_out: { am: 'ውጣ', en: 'Sign out' },
    settings_sign_in: { am: 'ግባ', en: 'Sign in' },
    settings_sign_up: { am: 'መለያ ፍጠር', en: 'Sign up' },
    email: { am: 'ኢሜይል', en: 'Email' },
    password: { am: 'የይለፍ ቃል', en: 'Password' },

    unauthorized: { am: 'ይህን ለማድረግ ፈቃድ የለዎትም', en: 'You are not authorized to do this' },
  };

  let currentLang = localStorage.getItem('nk_lang') ||
    (navigator.language && navigator.language.startsWith('am') ? 'am' : 'am');

  function t(key) {
    const entry = DICT[key];
    if (!entry) return key;
    return entry[currentLang] || entry.am || key;
  }

  function getLang() { return currentLang; }

  function setLang(lang) {
    currentLang = lang === 'en' ? 'en' : 'am';
    localStorage.setItem('nk_lang', currentLang);
    document.documentElement.setAttribute('lang', currentLang);
    document.dispatchEvent(new CustomEvent('nk-lang-changed'));
  }

  function applyStaticTranslations(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
  }

  global.I18N = { t, getLang, setLang, applyStaticTranslations, DICT };
})(window);
