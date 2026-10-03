/* ethiopian-calendar.js
 * Exact Ethiopian <-> Gregorian conversion via Julian Day Number, plus
 * Ethiopian-month-name parsing used to schedule ዕቅድ due dates.
 * No lookup tables: works for any year via the standard JDN formulas.
 */
(function (global) {
  const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;

  const EC_MONTHS = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሳስ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
  ];
  const EC_MONTHS_EN = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  // Common alternate spellings seen in real documents -> canonical index (0-12)
  const SPELLING_MAP = {
    'መስከረም': 0,
    'ጥቅምት': 1, 'ጥቀምት': 1,
    'ኅዳር': 2, 'ህዳር': 2, 'ሕዳር': 2,
    'ታኅሳስ': 3, 'ታህሳስ': 3, 'ታሕሳስ': 3, 'ታሀሳስ': 3,
    'ጥር': 4,
    'የካቲት': 5,
    'መጋቢት': 6,
    'ሚያዝያ': 7, 'ሚያዚያ': 7, 'መያዝያ': 7,
    'ግንቦት': 8,
    'ሰኔ': 9,
    'ሐምሌ': 10, 'ሃምሌ': 10, 'ሀምሌ': 10,
    'ነሐሴ': 11, 'ነሃሴ': 11, 'ነሀሴ': 11,
    'ጳጉሜ': 12, 'ጳጉሜን': 12
  };

  function isGregorianLeap(y) {
    return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  }

  function gregorianToJdn(year, month, day) {
    const y = month <= 2 ? year - 1 : year;
    const m = month <= 2 ? month + 12 : month;
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
  }

  function jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = 100 * b + d - 4800 + Math.floor(m / 10);
    return { year, month, day };
  }

  // Ethiopian leap year: every 4th year (year % 4 === 3, since EC epoch offset)
  function isEthiopianLeap(eyear) {
    return eyear % 4 === 3;
  }

  function ethiopicToJdn(year, month, day) {
    return 365 + (year - 1) * 365 + Math.floor(year / 4) + 30 * (month - 1) + day - 1 + JD_EPOCH_OFFSET_AMETE_MIHRET;
  }

  function jdnToEthiopic(jdn) {
    const r = (jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) % 1461;
    const n = (r % 365) + 365 * Math.floor(r / 1460);
    const year = 4 * Math.floor((jdn - JD_EPOCH_OFFSET_AMETE_MIHRET) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
    const month = Math.floor(n / 30) + 1;
    const day = (n % 30) + 1;
    return { year, month, day };
  }

  function toEthiopian(gDate) {
    const jdn = gregorianToJdn(gDate.getFullYear(), gDate.getMonth() + 1, gDate.getDate());
    return jdnToEthiopic(jdn);
  }

  function toGregorian(eyear, emonth, eday) {
    const jdn = ethiopicToJdn(eyear, emonth, eday);
    const g = jdnToGregorian(jdn);
    return new Date(g.year, g.month - 1, g.day);
  }

  function formatEC(ec, lang) {
    const names = lang === 'en' ? EC_MONTHS_EN : EC_MONTHS;
    return `${ec.day} ${names[ec.month - 1]} ${ec.year}`;
  }

  function formatBoth(gDate, lang) {
    const ec = toEthiopian(gDate);
    const gStr = gDate.toISOString().slice(0, 10);
    return `${formatEC(ec, lang)} (${gStr})`;
  }

  // Normalize a chunk of Amharic text: strip punctuation used as separators
  function tokenize(text) {
    return text
      .replace(/[፣,、/]/g, ' ')
      .replace(/[–—]/g, '-')
      .split(/\s+/)
      .filter(Boolean);
  }

  // Find every Ethiopian month named in a free-text "timing" field.
  // Handles single months, space/comma lists, and "ከX እስከY" ranges.
  function extractMonths(text) {
    if (!text) return { months: [], isRange: false };
    const found = new Set();
    const tokens = tokenize(text);
    for (const tok of tokens) {
      const clean = tok.replace(/^ከ/, '').replace(/እስከ$/, '');
      if (SPELLING_MAP.hasOwnProperty(clean)) {
        found.add(SPELLING_MAP[clean]);
      } else if (SPELLING_MAP.hasOwnProperty(tok)) {
        found.add(SPELLING_MAP[tok]);
      }
    }
    // "ከመስከረም እስከ ነሐሴ" / "ከመስከረም-ነሀሴ" / "መስከረም-ታህሳስ" (ከ is optional) -> expand to every month in between
    const rangeMatch = text.match(/(?:ከ\s*)?([\u1200-\u137F]+)\s*(?:እስከ|-)\s*([\u1200-\u137F]+)/);
    if (rangeMatch) {
      const a = SPELLING_MAP[rangeMatch[1]];
      const b = SPELLING_MAP[rangeMatch[2]];
      if (a !== undefined && b !== undefined) {
        let i = a;
        while (true) {
          found.add(i);
          if (i === b) break;
          i = (i + 1) % 13;
        }
        return { months: Array.from(found).sort((x, y) => x - y), isRange: true };
      }
    }
    return { months: Array.from(found).sort((x, y) => x - y), isRange: false };
  }

  // Given today's Gregorian date and a list of EC month indices (0-12),
  // return the nearest upcoming occurrence (year rolls over automatically).
  function nextOccurrenceOfMonths(monthIndices, fromDate) {
    if (!monthIndices.length) return null;
    const todayEc = toEthiopian(fromDate || new Date());
    let best = null;
    for (const mIdx of monthIndices) {
      const month = mIdx + 1; // stored 0-based, EC months are 1-based
      let year = todayEc.year;
      // If this month's 1st day has already passed this EC year, try next year
      const candidateJdn = ethiopicToJdn(year, month, 1);
      const todayJdn = ethiopicToJdn(todayEc.year, todayEc.month, todayEc.day);
      if (candidateJdn < todayJdn) year += 1;
      const gDate = toGregorian(year, month, 1);
      const jdn = ethiopicToJdn(year, month, 1);
      if (best === null || jdn < best.jdn) {
        best = { year, month, day: 1, gDate, jdn };
      }
    }
    return best;
  }

  // Day-interval fallback for text that names no specific month.
  // Returns approximate days-until-next based on recognized keywords.
  function fallbackIntervalDays(text) {
    const t = text || '';
    if (/12\s*ጊዜ|ወርሃዊ|በወር\s*1/.test(t)) return 30;
    if (/(\d+)\s*ጊዜ/.test(t)) {
      const n = parseInt(t.match(/(\d+)\s*ጊዜ/)[1], 10);
      if (n > 0) return Math.round(365 / n);
    }
    if (/ሩብ\s*[ዓአ]መት|quarterly/i.test(t)) return 91;
    if (/ስድስት\s*ወር|ግማሽ\s*[ዓአ]መት/.test(t)) return 182;
    if (/[ዓአ]መታዊ|[ዓአ]መቱን\s*ሙሉ|annual/i.test(t)) return 365;
    // እንደአስፈላጊነቱ / እንደተቀላቀሉ ወዲያውኑ / unspecified -> no fixed cadence
    return null;
  }

  // Main entry point: compute the next due date (EC + Gregorian) for a plan
  // item, given its raw `timing` text and an optional `lastDoneDate`.
  function computeNextDue(timingText, lastDoneDate) {
    const from = lastDoneDate || new Date();
    const { months } = extractMonths(timingText);
    if (months.length > 0) {
      const occ = nextOccurrenceOfMonths(months, from);
      if (occ) return { ec: { year: occ.year, month: occ.month, day: occ.day }, gDate: occ.gDate, mode: 'month' };
    }
    const days = fallbackIntervalDays(timingText);
    if (days) {
      const g = new Date(from);
      g.setDate(g.getDate() + days);
      return { ec: toEthiopian(g), gDate: g, mode: 'interval' };
    }
    return { ec: null, gDate: null, mode: 'none' };
  }

  global.EthCal = {
    toEthiopian, toGregorian, formatEC, formatBoth,
    extractMonths, nextOccurrenceOfMonths, fallbackIntervalDays,
    computeNextDue, EC_MONTHS, EC_MONTHS_EN, isEthiopianLeap
  };
})(window);
