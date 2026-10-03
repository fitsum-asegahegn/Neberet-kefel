/* auth.js — OPTIONAL cloud layer. If config.js is blank and the person
 * taps "Skip — offline only", none of this runs and the app works purely
 * off IndexedDB. When connected, this handles sign-in/up, role lookup
 * (member/admin via user_roles, RLS-enforced), display name (profiles
 * table), and best-effort two-way sync for every data table. */
(function (global) {
  const { t } = window.I18N;
  const TABLES = ['assets', 'income', 'expenses', 'repairs', 'contributions', 'planItems'];
  const TABLE_TO_SQL = {
    assets: 'assets', income: 'income', expenses: 'expenses',
    repairs: 'repairs', contributions: 'contributions', planItems: 'plan_items',
  };

  let supabase = null;
  let session = null;
  let role = 'member';
  let displayName = '';
  let offlineOnly = localStorage.getItem('nk_offline_only') === '1';

  function configured() {
    return !!(window.NK_CONFIG && window.NK_CONFIG.SUPABASE_URL && window.NK_CONFIG.SUPABASE_ANON_KEY);
  }

  function isAdmin() {
    if (!configured() || offlineOnly || !session) return true; // no shared team to restrict
    return role === 'admin';
  }

  async function init() {
    if (!configured()) return;
    if (!global.supabase || !global.supabase.createClient) return; // CDN not loaded (offline first run)
    supabase = global.supabase.createClient(window.NK_CONFIG.SUPABASE_URL, window.NK_CONFIG.SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getSession();
    session = data ? data.session : null;
    if (session) await loadProfile();
  }

  async function loadProfile() {
    try {
      const uid = session.user.id;
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', uid).maybeSingle();
      role = (roleRow && roleRow.role) || 'member';
      const { data: profRow } = await supabase.from('profiles').select('display_name').eq('user_id', uid).maybeSingle();
      displayName = (profRow && profRow.display_name) || (session.user.email || '').split('@')[0];
    } catch (e) { console.warn('profile load failed', e); }
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    session = data.session;
    if (session) await loadProfile();
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    session = data.session;
    await loadProfile();
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    session = null; role = 'member'; displayName = '';
  }

  async function saveDisplayName(name) {
    displayName = name;
    if (!supabase || !session) return;
    await supabase.from('profiles').upsert({ user_id: session.user.id, display_name: name });
  }

  // Push local unsynced rows up, then pull remote rows down (last-write-wins by updatedAt).
  async function sync() {
    if (!supabase || !session) return { pushed: 0, pulled: 0 };
    let pushed = 0, pulled = 0;
    for (const store of TABLES) {
      const sqlTable = TABLE_TO_SQL[store];
      const local = await window.NKDB.getAll(store);
      const unsynced = local.filter((r) => r.synced === false || r.synced === undefined);
      if (unsynced.length) {
        const payload = unsynced.map((r) => ({ ...r, synced: true, owner: session.user.id }));
        const { error } = await supabase.from(sqlTable).upsert(payload);
        if (!error) {
          for (const r of unsynced) await window.NKDB.put(store, { ...r, synced: true });
          pushed += unsynced.length;
        }
      }
      const { data: remote } = await supabase.from(sqlTable).select('*');
      if (remote) {
        for (const r of remote) {
          const localRow = await window.NKDB.get(store, r.id);
          if (!localRow || (r.updatedAt && r.updatedAt > (localRow.updatedAt || ''))) {
            await window.NKDB.put(store, { ...r, synced: true });
            pulled++;
          }
        }
      }
    }
    return { pushed, pulled };
  }

  async function refreshProfile() {
    if (session) await loadProfile();
  }

  function setOfflineOnly(v) {
    offlineOnly = v;
    localStorage.setItem('nk_offline_only', v ? '1' : '0');
  }

  function needsAuthGate() {
    return configured() && !session && !offlineOnly;
  }

  // Shared email/password sign-in+sign-up block, used by both the
  // full-screen gate and the Settings panel's not-signed-in state.
  // showSkip is always passed as false now: "offline only" is reachable
  // only by leaving config.js blank at deploy time, not as a runtime
  // bypass — otherwise anyone without an account could skip past sign-in
  // entirely and land with admin-equivalent access (offline mode has no
  // role restriction, by design, since there's no shared team to check
  // against). A person who already signed up still gets offline access
  // automatically next time, via their persisted session — no skip needed.
  function buildCredentialsForm(el, { showSkip }) {
    const wrap = el('div', {});
    const emailInput = el('input', { type: 'email', placeholder: t('email'), autocomplete: 'email' });
    const passInput = el('input', { type: 'password', placeholder: t('password'), autocomplete: 'current-password' });
    const status = el('p', { class: 'error-text' });
    wrap.appendChild(el('div', { class: 'form-row' }, [el('label', {}, [t('email')]), emailInput]));
    wrap.appendChild(el('div', { class: 'form-row' }, [el('label', {}, [t('password')]), passInput]));
    wrap.appendChild(el('div', { class: 'form-actions' }, [
      el('button', {
        type: 'button', class: 'btn primary', onclick: async () => {
          try { await signIn(emailInput.value, passInput.value); window.location.reload(); }
          catch (e) { status.textContent = e.message; }
        },
      }, [t('settings_sign_in')]),
      el('button', {
        type: 'button', class: 'btn ghost', onclick: async () => {
          try { await signUp(emailInput.value, passInput.value); window.location.reload(); }
          catch (e) { status.textContent = e.message; }
        },
      }, [t('settings_sign_up')]),
    ]));
    wrap.appendChild(status);
    if (showSkip) {
      wrap.appendChild(el('button', {
        class: 'btn ghost', style: 'margin-top:10px;width:100%',
        onclick: () => { setOfflineOnly(true); window.location.reload(); },
      }, [t('settings_offline_only')]));
    }
    return wrap;
  }

  // Full-screen sign-in/sign-up gate, shown before the app renders when
  // Supabase is configured and nobody has signed in or chosen offline-only.
  function renderAuthGate(el) {
    const screen = el('div', { class: 'auth-gate' });
    const card = el('div', { class: 'auth-gate-card' }, [
      el('h1', {}, [t('app_title')]),
      el('p', { class: 'muted', style: 'margin-bottom:16px' }, [t('settings_sign_in') + ' / ' + t('settings_sign_up')]),
    ]);
    card.appendChild(buildCredentialsForm(el, { showSkip: false }));
    screen.appendChild(card);
    return screen;
  }

  // ---------- settings UI ----------
  async function renderSettingsPanel(el) {
    const wrap = el('div', { class: 'auth-panel' });
    wrap.appendChild(el('h3', {}, [t('settings_supabase')]));

    if (!configured()) {
      wrap.appendChild(el('p', { class: 'muted' }, [
        'config.js has no Supabase URL/key set — running fully offline. Fill in config.js before deploying to enable multi-phone sync.',
      ]));
      return wrap;
    }

    if (offlineOnly && !session) {
      wrap.appendChild(el('p', { class: 'muted' }, [t('settings_offline_only')]));
      wrap.appendChild(el('button', { class: 'btn ghost', onclick: () => { setOfflineOnly(false); window.location.reload(); } }, ['↩']));
      return wrap;
    }

    if (session) {
      wrap.appendChild(el('p', {}, [t('settings_signed_in_as') + ': ' + (session.user.email || '')]));
      const nameRow = el('div', { class: 'form-row' }, [
        el('label', {}, [t('settings_display_name')]),
        el('input', { type: 'text', value: displayName, onchange: (e) => saveDisplayName(e.target.value) }),
      ]);
      wrap.appendChild(nameRow);
      wrap.appendChild(el('button', {
        class: 'btn primary', onclick: async () => {
          const r = await sync();
          alert(`${t('settings_sync_now')}: ${r.pushed} ↑ / ${r.pulled} ↓`);
        },
      }, [t('settings_sync_now')]));
      wrap.appendChild(el('button', { class: 'btn ghost', onclick: async () => { await signOut(); window.location.reload(); } }, [t('settings_sign_out')]));
      return wrap;
    }

    // Not signed in and not offline-only shouldn't normally be reachable here
    // (the gate catches it first), but handled for completeness.
    wrap.appendChild(buildCredentialsForm(el, { showSkip: false }));
    return wrap;
  }

  global.NKAuth = { init, isAdmin, signIn, signUp, signOut, sync, saveDisplayName, refreshProfile, renderSettingsPanel, renderAuthGate, needsAuthGate, configured };
})(window);
