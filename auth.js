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
  let approvalStatus = 'approved'; // safe default: unmigrated DBs and offline mode both act as if approved
  let displayName = '';
  let offlineOnly = localStorage.getItem('nk_offline_only') === '1';

  function configured() {
    return !!(window.NK_CONFIG && window.NK_CONFIG.SUPABASE_URL && window.NK_CONFIG.SUPABASE_ANON_KEY);
  }

  function isAdmin() {
    if (!configured() || offlineOnly || !session) return true; // no shared team to restrict
    return role === 'admin' && approvalStatus === 'approved';
  }

  // Pending/rejected only mean anything once someone is actually signed in
  // against a configured, non-offline-only backend.
  function isPending() {
    if (!configured() || offlineOnly || !session) return false;
    return approvalStatus === 'pending';
  }

  function isRejected() {
    if (!configured() || offlineOnly || !session) return false;
    return approvalStatus === 'rejected';
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
      const { data: roleRow } = await supabase.from('user_roles').select('role,status').eq('user_id', uid).maybeSingle();
      role = (roleRow && roleRow.role) || 'member';
      // roleRow.status is undefined on a DB that hasn't run the approval-workflow
      // migration yet — treat that the same as 'approved' so nothing breaks.
      approvalStatus = (roleRow && roleRow.status) || 'approved';
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

  // Full-screen "awaiting approval" / "rejected" gate — shown instead of
  // the main app once someone is signed in but an admin hasn't approved
  // them yet (or has rejected them).
  function renderApprovalGate(el) {
    const screen = el('div', { class: 'auth-gate' });
    const rejected = approvalStatus === 'rejected';
    const card = el('div', { class: 'auth-gate-card' }, [
      el('h1', {}, [t('app_title')]),
      el('p', { style: 'text-align:center;margin-bottom:6px' }, [rejected ? t('approval_rejected_title') : t('approval_pending_title')]),
      el('p', { class: 'muted', style: 'text-align:center;margin-bottom:16px' }, [session && session.user ? session.user.email : '']),
    ]);
    const actions = el('div', { class: 'form-actions', style: 'justify-content:center;flex-wrap:wrap' });
    if (!rejected) {
      actions.appendChild(el('button', {
        type: 'button', class: 'btn primary',
        onclick: async () => { await loadProfile(); window.location.reload(); },
      }, [t('approval_refresh')]));
    }
    actions.appendChild(el('button', {
      type: 'button', class: 'btn ghost',
      onclick: async () => { await signOut(); window.location.reload(); },
    }, [t('settings_sign_out')]));
    card.appendChild(actions);
    screen.appendChild(card);
    return screen;
  }

  // ---------- admin: approve / assign roles ----------
  async function fetchAllUsers() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('user_id,display_name,email'),
      supabase.from('user_roles').select('user_id,role,status'),
    ]);
    const byId = {};
    (profiles || []).forEach((p) => { byId[p.user_id] = { ...byId[p.user_id], ...p }; });
    (roles || []).forEach((r) => { byId[r.user_id] = { ...byId[r.user_id], ...r }; });
    return Object.values(byId).sort((a, b) => {
      const order = { pending: 0, approved: 1, rejected: 2 };
      return (order[a.status] ?? 1) - (order[b.status] ?? 1);
    });
  }

  async function setUserRoleStatus(userId, newRole, newStatus) {
    const { error } = await supabase.from('user_roles').update({ role: newRole, status: newStatus }).eq('user_id', userId);
    if (error) throw error;
  }

  async function renderUsersPanel(el) {
    const wrap = el('div', { class: 'auth-panel' });
    wrap.appendChild(el('h3', {}, [t('users_title')]));
    const listHost = el('div');
    wrap.appendChild(listHost);

    async function renderList() {
      listHost.innerHTML = '';
      let users;
      try { users = await fetchAllUsers(); } catch (e) {
        listHost.appendChild(el('p', { class: 'error-text' }, [String(e.message || e)]));
        return;
      }
      if (!users.length) {
        listHost.appendChild(el('p', { class: 'empty' }, [t('no_records')]));
        return;
      }
      users.forEach((u) => listHost.appendChild(renderUserRow(u)));
    }

    function renderUserRow(u) {
      const isSelf = session && session.user && session.user.id === u.user_id;
      const row = el('div', { class: 'user-row' });
      const statusClass = u.status === 'pending' ? 'warn' : u.status === 'rejected' ? 'danger' : 'good';
      row.appendChild(el('div', { class: 'user-row-head' }, [
        el('strong', {}, [u.email || u.display_name || u.user_id]),
        el('span', { class: 'user-badge ' + statusClass }, [t('status_' + (u.status || 'approved'))]),
      ]));
      row.appendChild(el('div', { class: 'muted' }, [
        `${t('users_role')}: ${t(u.role === 'admin' ? 'users_role_admin' : 'users_role_member')}` + (isSelf ? ` (${t('users_you')})` : ''),
      ]));

      const actions = el('div', { class: 'followup-actions', style: 'margin-top:6px' });
      if (u.status === 'pending') {
        actions.appendChild(el('button', { class: 'btn small primary', onclick: () => act(u, 'member', 'approved') }, [t('users_approve_member')]));
        actions.appendChild(el('button', { class: 'btn small primary', onclick: () => act(u, 'admin', 'approved') }, [t('users_approve_admin')]));
        actions.appendChild(el('button', { class: 'btn small ghost', onclick: () => act(u, u.role || 'member', 'rejected') }, [t('users_reject')]));
      } else if (u.status === 'approved') {
        if (u.role !== 'admin') actions.appendChild(el('button', { class: 'btn small ghost', onclick: () => act(u, 'admin', 'approved') }, [t('users_make_admin')]));
        if (u.role === 'admin') actions.appendChild(el('button', { class: 'btn small ghost', onclick: () => act(u, 'member', 'approved') }, [t('users_make_member')]));
        actions.appendChild(el('button', { class: 'btn small ghost', onclick: () => act(u, u.role || 'member', 'rejected') }, [t('users_revoke')]));
      } else {
        actions.appendChild(el('button', { class: 'btn small primary', onclick: () => act(u, 'member', 'approved') }, [t('users_reapprove')]));
      }
      row.appendChild(actions);
      return row;
    }

    async function act(u, newRole, newStatus) {
      try {
        await setUserRoleStatus(u.user_id, newRole, newStatus);
        await renderList();
      } catch (e) { alert(String(e.message || e)); }
    }

    await renderList();
    return wrap;
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
      if (isAdmin()) wrap.appendChild(await renderUsersPanel(el));
      return wrap;
    }

    // Not signed in and not offline-only shouldn't normally be reachable here
    // (the gate catches it first), but handled for completeness.
    wrap.appendChild(buildCredentialsForm(el, { showSkip: false }));
    return wrap;
  }

  global.NKAuth = {
    init, isAdmin, isPending, isRejected, signIn, signUp, signOut, sync, saveDisplayName, refreshProfile,
    renderSettingsPanel, renderAuthGate, renderApprovalGate, needsAuthGate, configured,
  };
})(window);
