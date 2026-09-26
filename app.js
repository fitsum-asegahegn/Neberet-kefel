/* app.js — module CRUD, dashboard, ዕቅድ engine, Excel import/export, reports */
(function () {
  const { t } = window.I18N;

  const MODULES = {
    assets: {
      store: 'assets', navKey: 'nav_assets', titleKey: 'asset_registry',
      fields: [
        { key: 'code', labelKey: 'asset_code', type: 'text' },
        { key: 'name', labelKey: 'asset_name', type: 'text', required: true },
        { key: 'category', labelKey: 'asset_category', type: 'text' },
        { key: 'source', labelKey: 'asset_source', type: 'select', options: [['purchase', 'asset_source_purchase'], ['gift', 'asset_source_gift']] },
        { key: 'dateReceived', labelKey: 'asset_date_received', type: 'date' },
        { key: 'status', labelKey: 'asset_status', type: 'select', options: [['active', 'asset_status_active'], ['damaged', 'asset_status_damaged'], ['repair', 'asset_status_repair'], ['disposed', 'asset_status_disposed']] },
        { key: 'location', labelKey: 'asset_location', type: 'text' },
        { key: 'letterRef', labelKey: 'asset_letter_ref', type: 'text' },
        { key: 'notes', labelKey: 'asset_notes', type: 'textarea' },
      ],
      listColumns: ['code', 'name', 'category', 'status', 'location'],
    },
    income: {
      store: 'income', navKey: 'nav_finance', titleKey: 'income',
      fields: [
        { key: 'date', labelKey: 'date', type: 'date', required: true },
        { key: 'source', labelKey: 'income_source', type: 'select', options: [['holiday', 'income_source_holiday'], ['subunit', 'income_source_subunit'], ['development', 'income_source_development'], ['other', 'income_source_other']] },
        { key: 'amount', labelKey: 'amount', type: 'number', required: true },
        { key: 'deposited', labelKey: 'deposited', type: 'checkbox' },
        { key: 'depositDate', labelKey: 'deposit_date', type: 'date' },
        { key: 'receiptTo', labelKey: 'receipt_to', type: 'text' },
        { key: 'recordedBy', labelKey: 'recorded_by', type: 'text' },
        { key: 'notes', labelKey: 'asset_notes', type: 'textarea' },
      ],
      listColumns: ['date', 'source', 'amount', 'deposited'],
    },
    expenses: {
      store: 'expenses', navKey: 'nav_finance', titleKey: 'expense',
      fields: [
        { key: 'date', labelKey: 'date', type: 'date', required: true },
        { key: 'purpose', labelKey: 'expense_purpose', type: 'text', required: true },
        { key: 'amount', labelKey: 'amount', type: 'number', required: true },
        { key: 'authorizedBy', labelKey: 'authorized_by', type: 'text' },
        { key: 'signatureConfirmed', labelKey: 'signature_confirmed', type: 'checkbox' },
        { key: 'reconciled', labelKey: 'reconciled', type: 'checkbox' },
        { key: 'recordedBy', labelKey: 'recorded_by', type: 'text' },
        { key: 'notes', labelKey: 'asset_notes', type: 'textarea' },
      ],
      listColumns: ['date', 'purpose', 'amount', 'reconciled'],
    },
    repairs: {
      store: 'repairs', navKey: 'nav_repairs', titleKey: 'nav_repairs',
      fields: [
        { key: 'itemName', labelKey: 'repair_item', type: 'text', required: true },
        { key: 'description', labelKey: 'repair_desc', type: 'textarea' },
        { key: 'dateReported', labelKey: 'repair_reported', type: 'date' },
        { key: 'assignee', labelKey: 'repair_assignee', type: 'text' },
        { key: 'volunteer', labelKey: 'repair_volunteer', type: 'checkbox' },
        { key: 'cost', labelKey: 'repair_cost', type: 'number' },
        { key: 'status', labelKey: 'repair_status', type: 'select', options: [['pending', 'repair_status_pending'], ['progress', 'repair_status_progress'], ['done', 'repair_status_done']] },
        { key: 'resolvedDate', labelKey: 'repair_resolved_date', type: 'date' },
      ],
      listColumns: ['itemName', 'status', 'cost', 'dateReported'],
    },
    contributions: {
      store: 'contributions', navKey: 'nav_contrib', titleKey: 'nav_contrib',
      fields: [
        { key: 'period', labelKey: 'contrib_period', type: 'text', required: true },
        { key: 'leaderName', labelKey: 'contrib_leader', type: 'text', required: true },
        { key: 'expected', labelKey: 'contrib_expected', type: 'number' },
        { key: 'paid', labelKey: 'contrib_paid', type: 'number' },
        { key: 'datePaid', labelKey: 'contrib_date_paid', type: 'date' },
        { key: 'collectedBy', labelKey: 'contrib_collected_by', type: 'text' },
      ],
      listColumns: ['period', 'leaderName', 'expected', 'paid'],
    },
  };

  const app = document.getElementById('app');
  let currentTab = 'dashboard';
  let searchTerm = '';

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    });
    (children || []).forEach((c) => e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  }

  function fmtMoney(n) {
    n = Number(n) || 0;
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ብር';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return window.EthCal.formatBoth(d, window.I18N.getLang());
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // ---------- nav ----------
  const TABS = [
    ['dashboard', 'nav_dashboard', '📊'],
    ['assets', 'nav_assets', '📦'],
    ['finance', 'nav_finance', '💰'],
    ['repairs', 'nav_repairs', '🔧'],
    ['contributions', 'nav_contrib', '🤝'],
    ['plan', 'nav_plan', '🗓️'],
    ['settings', 'nav_settings', '⚙️'],
  ];

  function renderNav() {
    const nav = document.getElementById('tabbar');
    nav.innerHTML = '';
    TABS.forEach(([key, labelKey, icon]) => {
      const btn = el('button', {
        class: 'tab-btn' + (currentTab === key ? ' active' : ''),
        onclick: () => { currentTab = key; searchTerm = ''; render(); },
      }, [el('span', { class: 'tab-icon' }, [icon]), el('span', { class: 'tab-label' }, [t(labelKey)])]);
      nav.appendChild(btn);
    });
  }

  async function render() {
    renderNav();
    app.innerHTML = '';
    if (currentTab === 'dashboard') await renderDashboard();
    else if (currentTab === 'assets') await renderModule('assets');
    else if (currentTab === 'finance') await renderFinance();
    else if (currentTab === 'repairs') await renderModule('repairs');
    else if (currentTab === 'contributions') await renderModule('contributions');
    else if (currentTab === 'plan') await renderPlan();
    else if (currentTab === 'settings') await renderSettings();
    window.I18N.applyStaticTranslations(app);
  }

  // ---------- generic module list/form ----------
  async function renderModule(modKey, opts) {
    opts = opts || {};
    const mod = MODULES[modKey];
    const wrap = el('div', { class: 'panel' });
    const header = el('div', { class: 'panel-header' }, [
      el('h2', {}, [t(mod.titleKey)]),
      el('button', { class: 'btn primary', onclick: () => openForm(modKey) }, [t('add_new')]),
    ]);
    const toolbar = el('div', { class: 'toolbar' }, [
      el('input', {
        type: 'search', placeholder: t('search'), value: searchTerm,
        oninput: (e) => { searchTerm = e.target.value; renderList(); },
      }),
      el('button', { class: 'btn ghost', onclick: () => exportModuleExcel(modKey) }, [t('export_excel')]),
    ]);
    const listHost = el('div', { class: 'list-host' });
    wrap.appendChild(header);
    wrap.appendChild(toolbar);
    wrap.appendChild(listHost);
    app.appendChild(wrap);

    async function renderList() {
      listHost.innerHTML = '';
      let records = await window.NKDB.getAll(mod.store);
      records.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        records = records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
      }
      if (!records.length) {
        listHost.appendChild(el('p', { class: 'empty' }, [t('no_records')]));
        return;
      }
      const table = el('table', { class: 'data-table' });
      const thead = el('tr', {}, mod.listColumns.map((c) => el('th', {}, [t(fieldLabelKey(mod, c))])));
      thead.appendChild(el('th', {}, ['']));
      table.appendChild(el('thead', {}, [thead]));
      const tbody = el('tbody');
      records.forEach((r) => {
        const tr = el('tr', {});
        mod.listColumns.forEach((c) => {
          const f = mod.fields.find((x) => x.key === c);
          tr.appendChild(el('td', {}, [renderCell(f, r[c])]));
        });
        const actions = el('td', { class: 'row-actions' }, [
          el('button', { class: 'icon-btn', title: t('edit'), onclick: () => openForm(modKey, r) }, ['✏️']),
          el('button', { class: 'icon-btn danger', title: t('delete'), onclick: () => deleteRecord(mod, r) }, ['🗑️']),
        ]);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      listHost.appendChild(table);
    }

    function renderCell(field, value) {
      if (!field) return String(value ?? '');
      if (field.type === 'checkbox') return value ? '✅' : '—';
      if (field.type === 'date') return fmtDate(value);
      if (field.type === 'select') {
        const opt = field.options.find((o) => o[0] === value);
        return opt ? t(opt[1]) : (value || '—');
      }
      if (field.type === 'number' && (field.key === 'amount' || field.key === 'cost' || field.key === 'expected' || field.key === 'paid')) {
        return value != null && value !== '' ? fmtMoney(value) : '—';
      }
      return value || '—';
    }

    await renderList();
  }

  function fieldLabelKey(mod, key) {
    const f = mod.fields.find((x) => x.key === key);
    return f ? f.labelKey : key;
  }

  async function deleteRecord(mod, record) {
    if (!confirm(t('confirm_delete'))) return;
    await window.NKDB.remove(mod.store, record.id);
    render();
  }

  function openForm(modKey, record) {
    const mod = MODULES[modKey];
    const isEdit = !!record;
    record = record ? { ...record } : {};
    const overlay = el('div', { class: 'modal-overlay' });
    const form = el('form', { class: 'modal-card' });
    form.appendChild(el('h3', {}, [t(mod.titleKey)]));
    const fieldEls = {};
    mod.fields.forEach((f) => {
      const row = el('div', { class: 'form-row' });
      row.appendChild(el('label', {}, [t(f.labelKey) + (f.required ? ' *' : '')]));
      let input;
      if (f.type === 'select') {
        input = el('select', { name: f.key });
        input.appendChild(el('option', { value: '' }, ['—']));
        f.options.forEach(([val, labelKey]) => {
          const o = el('option', { value: val }, [t(labelKey)]);
          if (record[f.key] === val) o.setAttribute('selected', 'selected');
          input.appendChild(o);
        });
      } else if (f.type === 'textarea') {
        input = el('textarea', { name: f.key, rows: '3' }, [record[f.key] || '']);
      } else if (f.type === 'checkbox') {
        input = el('input', { type: 'checkbox', name: f.key });
        if (record[f.key]) input.setAttribute('checked', 'checked');
      } else {
        input = el('input', { type: f.type, name: f.key, value: record[f.key] != null ? record[f.key] : '' });
      }
      fieldEls[f.key] = input;
      row.appendChild(input);
      form.appendChild(row);
    });
    const btnRow = el('div', { class: 'form-actions' }, [
      el('button', { type: 'button', class: 'btn ghost', onclick: () => overlay.remove() }, [t('cancel')]),
      el('button', { type: 'submit', class: 'btn primary' }, [t('save')]),
    ]);
    form.appendChild(btnRow);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = isEdit ? { ...record } : {};
      mod.fields.forEach((f) => {
        const input = fieldEls[f.key];
        if (f.type === 'checkbox') out[f.key] = input.checked;
        else if (f.type === 'number') out[f.key] = input.value === '' ? null : Number(input.value);
        else out[f.key] = input.value;
      });
      await window.NKDB.put(mod.store, out);
      overlay.remove();
      render();
    });
    overlay.appendChild(form);
    document.body.appendChild(overlay);
  }

  async function exportModuleExcel(modKey) {
    const mod = MODULES[modKey];
    const records = await window.NKDB.getAll(mod.store);
    const rows = records.map((r) => {
      const row = {};
      mod.fields.forEach((f) => { row[t(f.labelKey)] = r[f.key]; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, modKey.slice(0, 30));
    XLSX.writeFile(wb, `${modKey}-${todayIso()}.xlsx`);
  }

  // ---------- finance combined view ----------
  async function renderFinance() {
    const wrap = el('div', { class: 'panel' });
    const income = await window.NKDB.getAll('income');
    const expenses = await window.NKDB.getAll('expenses');
    const totalIncome = income.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpense = expenses.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const undeposited = income.filter((r) => !r.deposited).reduce((s, r) => s + (Number(r.amount) || 0), 0);

    wrap.appendChild(el('div', { class: 'stat-row' }, [
      statCard('total_income', fmtMoney(totalIncome), 'good'),
      statCard('total_expense', fmtMoney(totalExpense), 'warn'),
      statCard('balance', fmtMoney(totalIncome - totalExpense), 'neutral'),
      statCard('undeposited_amount', fmtMoney(undeposited), undeposited > 0 ? 'danger' : 'good'),
    ]));

    const tabsRow = el('div', { class: 'subtabs' });
    const body = el('div');
    let sub = 'income';
    function renderSub() {
      tabsRow.innerHTML = '';
      ['income', 'expenses'].forEach((k) => {
        tabsRow.appendChild(el('button', {
          class: 'subtab-btn' + (sub === k ? ' active' : ''),
          onclick: () => { sub = k; renderSub(); },
        }, [t(k === 'income' ? 'income' : 'expense')]));
      });
      body.innerHTML = '';
      const host = el('div');
      body.appendChild(host);
      const prevApp = app;
      renderModuleInto(host, sub);
    }
    wrap.appendChild(tabsRow);
    wrap.appendChild(body);
    app.appendChild(wrap);
    renderSub();
  }

  // renderModule but targeting an arbitrary host (used by finance sub-tabs)
  async function renderModuleInto(host, modKey) {
    const realApp = app;
    const fakeApp = host;
    const originalAppendChild = app.appendChild.bind(app);
    // simplest approach: temporarily swap the module's target by reusing renderModule logic inline
    const mod = MODULES[modKey];
    const wrap = el('div', { class: 'panel nested' });
    const header = el('div', { class: 'panel-header' }, [
      el('h2', {}, [t(mod.titleKey)]),
      el('button', { class: 'btn primary', onclick: () => openForm(modKey) }, [t('add_new')]),
    ]);
    const toolbar = el('div', { class: 'toolbar' }, [
      el('input', { type: 'search', placeholder: t('search'), oninput: (e) => { searchTerm = e.target.value; renderList(); } }),
      el('button', { class: 'btn ghost', onclick: () => exportModuleExcel(modKey) }, [t('export_excel')]),
    ]);
    const listHost = el('div', { class: 'list-host' });
    wrap.appendChild(header);
    wrap.appendChild(toolbar);
    wrap.appendChild(listHost);
    host.appendChild(wrap);

    async function renderList() {
      listHost.innerHTML = '';
      let records = await window.NKDB.getAll(mod.store);
      records.sort((a, b) => (b.date || b.updatedAt || '').localeCompare(a.date || a.updatedAt || ''));
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        records = records.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
      }
      if (!records.length) {
        listHost.appendChild(el('p', { class: 'empty' }, [t('no_records')]));
        return;
      }
      const table = el('table', { class: 'data-table' });
      const thead = el('tr', {}, mod.listColumns.map((c) => el('th', {}, [t(fieldLabelKey(mod, c))])));
      thead.appendChild(el('th', {}, ['']));
      table.appendChild(el('thead', {}, [thead]));
      const tbody = el('tbody');
      records.forEach((r) => {
        const tr = el('tr');
        mod.listColumns.forEach((c) => {
          const f = mod.fields.find((x) => x.key === c);
          let display;
          if (!f) display = String(r[c] ?? '');
          else if (f.type === 'checkbox') display = r[c] ? '✅' : '—';
          else if (f.type === 'date') display = fmtDate(r[c]);
          else if (f.type === 'select') { const o = f.options.find((x) => x[0] === r[c]); display = o ? t(o[1]) : (r[c] || '—'); }
          else if (f.type === 'number') display = r[c] != null && r[c] !== '' ? fmtMoney(r[c]) : '—';
          else display = r[c] || '—';
          tr.appendChild(el('td', {}, [display]));
        });
        tr.appendChild(el('td', { class: 'row-actions' }, [
          el('button', { class: 'icon-btn', onclick: () => openForm(modKey, r) }, ['✏️']),
          el('button', { class: 'icon-btn danger', onclick: () => deleteRecord(mod, r) }, ['🗑️']),
        ]));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      listHost.appendChild(table);
    }
    await renderList();
    // patch: reopening form / delete should refresh finance view, not full app render
    const origOpenForm = openForm;
  }

  function statCard(labelKey, value, tone) {
    return el('div', { class: 'stat-card ' + (tone || '') }, [
      el('div', { class: 'stat-value' }, [value]),
      el('div', { class: 'stat-label' }, [t(labelKey)]),
    ]);
  }

  // ---------- dashboard ----------
  async function renderDashboard() {
    const wrap = el('div', { class: 'panel' });
    const today = new Date();
    const ec = window.EthCal.toEthiopian(today);
    wrap.appendChild(el('div', { class: 'today-banner' }, [
      el('span', {}, [t('today_ec') + ': ']),
      el('strong', {}, [window.EthCal.formatEC(ec, window.I18N.getLang())]),
    ]));

    const [assets, income, repairs, plan] = await Promise.all([
      window.NKDB.getAll('assets'), window.NKDB.getAll('income'),
      window.NKDB.getAll('repairs'), window.NKDB.getAll('planItems'),
    ]);
    const undeposited = income.filter((r) => !r.deposited);
    const pendingRepairs = repairs.filter((r) => r.status !== 'done');
    const undepositedSum = undeposited.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    wrap.appendChild(el('div', { class: 'stat-row' }, [
      statCard('nav_assets', String(assets.length), 'neutral'),
      statCard('not_deposited', fmtMoney(undepositedSum), undepositedSum > 0 ? 'danger' : 'good'),
      statCard('pending_repairs', String(pendingRepairs.length), pendingRepairs.length ? 'warn' : 'good'),
    ]));

    wrap.appendChild(el('h3', {}, [t('upcoming_due')]));
    const upcomingList = el('div', { class: 'due-list' });
    const withDue = plan.filter((p) => p.nextDateGC).sort((a, b) => a.nextDateGC.localeCompare(b.nextDateGC)).slice(0, 6);
    if (!withDue.length) upcomingList.appendChild(el('p', { class: 'empty' }, [t('no_records')]));
    withDue.forEach((p) => {
      upcomingList.appendChild(el('div', { class: 'due-item' }, [
        el('div', { class: 'due-title' }, [p.title]),
        el('div', { class: 'due-date' }, [fmtDate(p.nextDateGC)]),
      ]));
    });
    wrap.appendChild(upcomingList);
    app.appendChild(wrap);
  }

  // ---------- plan (ዕቅድ) ----------
  async function seedPlanIfEmpty() {
    const existing = await window.NKDB.getAll('planItems');
    if (existing.length) return;
    const seeded = window.NK_PLAN_SEED.map((item) => {
      const due = window.EthCal.computeNextDue(item.timing, null);
      return {
        ...item,
        history: [],
        nextDateEC: due.ec,
        nextDateGC: due.gDate ? due.gDate.toISOString().slice(0, 10) : null,
      };
    });
    await window.NKDB.bulkPut('planItems', seeded);
  }

  async function renderPlan() {
    await seedPlanIfEmpty();
    const wrap = el('div', { class: 'panel' });
    wrap.appendChild(el('div', { class: 'panel-header' }, [
      el('h2', {}, [t('nav_plan')]),
      el('div', {}, [
        el('button', { class: 'btn ghost', onclick: () => importPlanExcel() }, [t('import_excel')]),
        el('button', { class: 'btn ghost', onclick: () => exportPlanExcel() }, [t('export_excel')]),
      ]),
    ]));

    const isAdmin = window.NKAuth ? window.NKAuth.isAdmin() : true;
    const reportBar = el('div', { class: 'toolbar' });
    if (isAdmin) {
      const periodSel = el('select', {}, [
        el('option', { value: '3' }, ['3 ' + t('report_period')]),
        el('option', { value: '6' }, ['6 ' + t('report_period')]),
        el('option', { value: '12' }, ['12 ' + t('report_period')]),
      ]);
      reportBar.appendChild(periodSel);
      reportBar.appendChild(el('button', { class: 'btn primary', onclick: () => generateReport(Number(periodSel.value)) }, [t('generate_report')]));
    } else {
      reportBar.appendChild(el('p', { class: 'muted' }, [t('admin_only_note')]));
    }
    wrap.appendChild(reportBar);

    const list = el('div', { class: 'plan-list' });
    const items = (await window.NKDB.getAll('planItems')).sort((a, b) => (a.no || 0) - (b.no || 0));
    items.forEach((p) => list.appendChild(renderPlanCard(p)));
    wrap.appendChild(list);

    wrap.appendChild(el('button', { class: 'btn ghost danger-text', onclick: () => resetPlan() }, [t('plan_reset')]));
    app.appendChild(wrap);
  }

  function renderPlanCard(p) {
    const card = el('div', { class: 'plan-card' });
    card.appendChild(el('div', { class: 'plan-card-head' }, [
      el('span', { class: 'plan-no' }, ['#' + p.no]),
      el('strong', {}, [p.title]),
    ]));
    if (p.details) card.appendChild(el('div', { class: 'plan-details' }, [p.details]));
    const meta = el('div', { class: 'plan-meta' }, [
      metaChip(t('plan_timing'), p.timing || '—'),
      metaChip(t('plan_target'), p.target || '—'),
      metaChip(t('plan_executor'), p.executor || '—'),
      metaChip(t('plan_weight'), p.weight || '—'),
    ]);
    card.appendChild(meta);
    card.appendChild(el('div', { class: 'plan-due' }, [
      el('span', {}, [t('plan_next_due') + ': ']),
      el('strong', {}, [p.nextDateGC ? fmtDate(p.nextDateGC) : '—']),
    ]));
    const actions = el('div', { class: 'plan-actions' }, [
      el('button', { class: 'btn small primary', onclick: () => markPlanDone(p) }, [t('plan_mark_done')]),
    ]);
    if (p.history && p.history.length) {
      const hist = el('details', { class: 'plan-history' }, [
        el('summary', {}, [t('plan_history') + ` (${p.history.length})`]),
      ]);
      p.history.slice().reverse().forEach((h) => {
        hist.appendChild(el('div', { class: 'history-row' }, [`${fmtDate(h.date)} — ${h.note || ''}`]));
      });
      card.appendChild(hist);
    }
    card.appendChild(actions);
    return card;
  }

  function metaChip(label, value) {
    return el('div', { class: 'meta-chip' }, [el('span', { class: 'meta-label' }, [label]), el('span', {}, [value])]);
  }

  function markPlanDone(p) {
    const overlay = el('div', { class: 'modal-overlay' });
    const form = el('form', { class: 'modal-card' });
    form.appendChild(el('h3', {}, [p.title]));
    form.appendChild(el('div', { class: 'form-row' }, [
      el('label', {}, [t('plan_done_note')]),
      el('textarea', { name: 'note', rows: '3' }),
    ]));
    form.appendChild(el('div', { class: 'form-actions' }, [
      el('button', { type: 'button', class: 'btn ghost', onclick: () => overlay.remove() }, [t('cancel')]),
      el('button', { type: 'submit', class: 'btn primary' }, [t('save')]),
    ]));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = form.querySelector('[name=note]').value;
      const now = new Date();
      const history = (p.history || []).concat([{ date: now.toISOString().slice(0, 10), note }]);
      const due = window.EthCal.computeNextDue(p.timing, now);
      const updated = {
        ...p, history,
        nextDateEC: due.ec,
        nextDateGC: due.gDate ? due.gDate.toISOString().slice(0, 10) : null,
      };
      await window.NKDB.put('planItems', updated);
      overlay.remove();
      render();
    });
    overlay.appendChild(form);
    document.body.appendChild(overlay);
  }

  async function resetPlan() {
    if (!confirm(t('confirm_delete'))) return;
    const existing = await window.NKDB.getAll('planItems');
    for (const p of existing) await window.NKDB.remove('planItems', p.id);
    await seedPlanIfEmpty();
    render();
  }

  function exportPlanExcel() {
    window.NKDB.getAll('planItems').then((items) => {
      const rows = items.map((p) => ({
        [t('plan_no')]: p.no, [t('plan_subunit')]: p.subUnit, [t('plan_title')]: p.title,
        [t('plan_details')]: p.details, [t('plan_outcome')]: p.outcome, [t('plan_indicator')]: p.indicator,
        [t('plan_target')]: p.target, [t('plan_timing')]: p.timing, [t('plan_executor')]: p.executor,
        [t('plan_budget')]: p.budget, [t('plan_weight')]: p.weight,
        'category': p.category,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ዕቅድ');
      XLSX.writeFile(wb, `plan-${todayIso()}.xlsx`);
    });
  }

  function importPlanExcel() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const existing = await window.NKDB.getAll('planItems');
      for (const row of rows) {
        const title = pick(row, ['ዕቅድ/ፕሮጀክት', 'Title', 'title']);
        const subUnit = pick(row, ['ንዑስ ክፍል', 'Sub-unit', 'subUnit']) || '';
        if (!title) continue;
        const match = existing.find((e) => e.title === title && (e.subUnit || '') === subUnit);
        const timing = pick(row, ['የክንውን ጊዜ', 'Timing', 'timing']) || '';
        const due = window.EthCal.computeNextDue(timing, null);
        const record = {
          id: match ? match.id : undefined,
          no: Number(pick(row, ['ተ.ቁ', 'No', 'no'])) || (match ? match.no : existing.length + 1),
          subUnit,
          title,
          details: pick(row, ['የክንውን ዝርዝር', 'Details', 'details']) || '',
          outcome: pick(row, ['ውጤት', 'Outcome', 'outcome']) || '',
          indicator: pick(row, ['አመልካች', 'Indicator', 'indicator']) || '',
          target: pick(row, ['መለኪያ', 'Target', 'target']) || '',
          timing,
          executor: pick(row, ['ፈጻሚ አካል', 'Executor', 'executor']) || '',
          budget: pick(row, ['በጀት', 'Budget', 'budget']) || '',
          category: (pick(row, ['ምድብ', 'Category', 'category']) || 'main').toLowerCase(),
          history: match ? match.history : [],
          nextDateEC: match ? match.nextDateEC : due.ec,
          nextDateGC: match ? match.nextDateGC : (due.gDate ? due.gDate.toISOString().slice(0, 10) : null),
        };
        await window.NKDB.put('planItems', record);
      }
      render();
    };
    input.click();
  }

  function pick(row, keys) {
    for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
    return undefined;
  }

  // ---------- report generation (print view) ----------
  async function generateReport(months) {
    const [income, expenses, repairs, plan, assets] = await Promise.all([
      window.NKDB.getAll('income'), window.NKDB.getAll('expenses'),
      window.NKDB.getAll('repairs'), window.NKDB.getAll('planItems'), window.NKDB.getAll('assets'),
    ]);
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const inRange = (d) => d && new Date(d) >= cutoff;
    const periodIncome = income.filter((r) => inRange(r.date));
    const periodExpense = expenses.filter((r) => inRange(r.date));
    const totalIncome = periodIncome.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpense = periodExpense.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const repairsDone = repairs.filter((r) => r.status === 'done' && inRange(r.resolvedDate)).length;
    const repairsPending = repairs.filter((r) => r.status !== 'done').length;

    const win = window.open('', '_blank');
    const lang = window.I18N.getLang();
    const rows = plan.map((p) => {
      const doneInPeriod = (p.history || []).filter((h) => inRange(h.date)).length;
      const status = doneInPeriod > 0 ? t('plan_status_on_track') : t('plan_status_needs_attn');
      return `<tr><td>${p.no}</td><td>${p.title}</td><td>${p.timing || ''}</td><td>${doneInPeriod}</td><td>${status}</td></tr>`;
    }).join('');

    win.document.write(`
      <html lang="${lang}"><head><meta charset="utf-8"><title>${t('generate_report')}</title>
      <style>
        body{font-family:'Noto Sans Ethiopic',sans-serif;padding:32px;color:#1a1a1a;}
        h1{font-family:'Noto Serif Ethiopic',serif;}
        table{width:100%;border-collapse:collapse;margin:16px 0;}
        th,td{border:1px solid #ccc;padding:6px 10px;text-align:${lang === 'en' ? 'left' : 'right'};font-size:13px;}
        th{background:#f0ece0;}
        .stats{display:flex;gap:16px;margin:16px 0;flex-wrap:wrap;}
        .stat{border:1px solid #ccc;padding:10px 16px;border-radius:6px;}
      </style></head><body>
      <h1>${t('app_title')} — ${t('generate_report')} (${months} ${lang === 'en' ? 'months' : 'ወር'})</h1>
      <p>${new Date().toLocaleDateString()} — ${window.EthCal.formatEC(window.EthCal.toEthiopian(new Date()), lang)}</p>
      <div class="stats">
        <div class="stat"><strong>${t('total_income')}:</strong> ${fmtMoney(totalIncome)}</div>
        <div class="stat"><strong>${t('total_expense')}:</strong> ${fmtMoney(totalExpense)}</div>
        <div class="stat"><strong>${t('nav_assets')}:</strong> ${assets.length}</div>
        <div class="stat"><strong>${t('pending_repairs')}:</strong> ${repairsPending} (${lang === 'en' ? 'done' : 'ተጠናቋል'}: ${repairsDone})</div>
      </div>
      <h2>${t('nav_plan')}</h2>
      <table><thead><tr><th>${t('plan_no')}</th><th>${t('plan_title')}</th><th>${t('plan_timing')}</th><th>#</th><th>${t('plan_status_on_track')}</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.print()</script>
      </body></html>`);
    win.document.close();
  }

  // ---------- settings ----------
  async function renderSettings() {
    const wrap = el('div', { class: 'panel' });
    wrap.appendChild(el('h2', {}, [t('nav_settings')]));

    const langRow = el('div', { class: 'form-row' }, [
      el('label', {}, [t('language')]),
      el('div', { class: 'lang-toggle' }, [
        el('button', { class: 'btn small' + (window.I18N.getLang() === 'am' ? ' primary' : ' ghost'), onclick: () => { window.I18N.setLang('am'); render(); } }, ['አማ']),
        el('button', { class: 'btn small' + (window.I18N.getLang() === 'en' ? ' primary' : ' ghost'), onclick: () => { window.I18N.setLang('en'); render(); } }, ['EN']),
      ]),
    ]);
    wrap.appendChild(langRow);

    if (window.NKAuth) {
      wrap.appendChild(await window.NKAuth.renderSettingsPanel(el));
    }

    app.appendChild(wrap);
  }

  // ---------- boot ----------
  function showBootError(msg) {
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'panel' }, [
      el('h2', {}, ['⚠️ Could not start']),
      el('p', {}, [msg]),
      el('p', { class: 'muted' }, [
        "If you opened this file directly (file://...), that's usually why: " +
        'the local database this app needs is blocked on that origin in most ' +
        'mobile browsers. Serve it over http(s) instead \u2014 deploy to GitHub ' +
        'Pages, or run a quick local server and open it via http://localhost/...',
      ]),
    ]));
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      if (typeof indexedDB === 'undefined') {
        showBootError('IndexedDB is not available on this page (origin: ' + location.origin + location.pathname + ').');
        return;
      }
      await window.NKDB.open();
      await seedPlanIfEmpty();
      if (window.NKAuth) {
        try { await window.NKAuth.init(); } catch (e) { console.warn('auth init failed, continuing offline', e); }
      }
      render();
    } catch (err) {
      console.error('Boot failed:', err);
      showBootError(String(err && err.message ? err.message : err));
    }
  });

  document.addEventListener('nk-lang-changed', render);
})();
