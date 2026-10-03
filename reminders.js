/* reminders.js — LOCAL reminders only. Uses the browser Notification API
 * while this app is open on this device. This is NOT push — there is no
 * server, so nothing can wake the app or send a notification once it's
 * closed. A digest is checked at most once per calendar day (or on demand
 * via "Check now") and only fires if there's something worth flagging. */
(function (global) {
  const ENABLED_KEY = 'nk_reminders_enabled';
  const LAST_KEY = 'nk_reminders_last_date';

  function isEnabled() { return localStorage.getItem(ENABLED_KEY) === '1'; }
  function setEnabled(v) { localStorage.setItem(ENABLED_KEY, v ? '1' : '0'); }

  function permissionState() {
    return ('Notification' in window) ? Notification.permission : 'unsupported';
  }

  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
  }

  function fire(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(title, { body, icon: 'icon-192.png' }); } catch (e) { console.warn('notify failed', e); }
  }

  function fmtMoney(n) {
    n = Number(n) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ብር';
  }

  async function gatherDigest() {
    const [income, repairs, plan] = await Promise.all([
      window.NKDB.getAll('income'), window.NKDB.getAll('repairs'), window.NKDB.getAll('planItems'),
    ]);
    const undeposited = income.filter((r) => !r.deposited).reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const pendingRepairs = repairs.filter((r) => r.status !== 'done').length;
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const dueSoon = plan.filter((p) => p.nextDateGC && new Date(p.nextDateGC) <= soon);

    const t = window.I18N.t;
    const lines = [];
    if (undeposited > 0) lines.push(`💰 ${fmtMoney(undeposited)} — ${t('not_deposited')}`);
    if (pendingRepairs > 0) lines.push(`🔧 ${pendingRepairs} — ${t('pending_repairs')}`);
    if (dueSoon.length > 0) lines.push(`🗓️ ${dueSoon.length} — ${t('upcoming_due')}`);
    return { lines, hasAny: lines.length > 0 };
  }

  async function checkAndNotify(force) {
    if (!isEnabled()) return { skipped: 'disabled' };
    if (permissionState() !== 'granted') return { skipped: 'no-permission' };
    const today = new Date().toISOString().slice(0, 10);
    if (!force && localStorage.getItem(LAST_KEY) === today) return { skipped: 'already-today' };
    const digest = await gatherDigest();
    if (digest.hasAny) fire(window.I18N.t('app_title'), digest.lines.join('\n'));
    localStorage.setItem(LAST_KEY, today);
    return { fired: digest.hasAny, lines: digest.lines };
  }

  global.NKReminders = { isEnabled, setEnabled, permissionState, requestPermission, checkAndNotify };
})(window);
