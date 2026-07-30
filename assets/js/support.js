/* =========================================================================
   support.js — заједничко понашање прототипа „Видовдан"
   -------------------------------------------------------------------------
   1. Писмо: ћирилица ⇄ латиница (право пресловљавање, памти се)
   2. Тема: дневно / ноћно читање
   3. Навигација: лепљива трака, мени за мобилни, претрага
   4. Читање: трака напретка кроз текст
   5. Датум: грегоријански + јулијански
   6. Појављивање елемената при скроловању
   ========================================================================= */

(function () {
  'use strict';

  const STORE_SCRIPT = 'vd-pismo';
  const STORE_THEME = 'vd-tema';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================= 1. ПИСМО ====== */

  const MAP = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'đ', 'е': 'e',
    'ж': 'ž', 'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj',
    'м': 'm', 'н': 'n', 'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
    'т': 't', 'ћ': 'ć', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'č',
    'џ': 'dž', 'ш': 'š'
  };

  const UPPER = {
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Ђ': 'Đ', 'Е': 'E',
    'Ж': 'Ž', 'З': 'Z', 'И': 'I', 'Ј': 'J', 'К': 'K', 'Л': 'L', 'Љ': 'Lj',
    'М': 'M', 'Н': 'N', 'Њ': 'Nj', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'Ћ': 'Ć', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'Č',
    'Џ': 'Dž', 'Ш': 'Š'
  };

  const DIGRAPH_UPPER = { 'Љ': 'LJ', 'Њ': 'NJ', 'Џ': 'DŽ' };

  function isUpperCyr(ch) {
    return ch !== undefined && Object.prototype.hasOwnProperty.call(UPPER, ch);
  }

  /**
   * Пресловљавање ћирилице у латиницу.
   * ЉУБАВ → LJUBAV, а Љубав → Ljubav — двознаци прате околна велика слова.
   */
  function toLatin(text) {
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (MAP[ch] !== undefined) {
        out += MAP[ch];
      } else if (UPPER[ch] !== undefined) {
        if (DIGRAPH_UPPER[ch] && isUpperCyr(text[i + 1])) {
          out += DIGRAPH_UPPER[ch];
        } else {
          out += UPPER[ch];
        }
      } else {
        out += ch;
      }
    }
    return out;
  }

  const SKIP = { SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  const originals = new Map();
  let currentScript = 'cyr';

  function collectTextNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let el = node.parentElement;
        while (el) {
          if (SKIP[el.tagName]) return NodeFilter.FILTER_REJECT;
          if (el.hasAttribute('data-keep-script')) return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function setScript(script) {
    if (script === currentScript) return;

    if (script === 'lat') {
      collectTextNodes().forEach(function (node) {
        if (!originals.has(node)) originals.set(node, node.nodeValue);
        node.nodeValue = toLatin(originals.get(node));
      });
      document.querySelectorAll('[placeholder]').forEach(function (el) {
        if (!el.dataset.phOrig) el.dataset.phOrig = el.getAttribute('placeholder');
        el.setAttribute('placeholder', toLatin(el.dataset.phOrig));
      });
      document.documentElement.lang = 'sr-Latn';
    } else {
      originals.forEach(function (value, node) {
        if (node.isConnected) node.nodeValue = value;
      });
      document.querySelectorAll('[data-ph-orig]').forEach(function (el) {
        el.setAttribute('placeholder', el.dataset.phOrig);
      });
      document.documentElement.lang = 'sr-Cyrl';
    }

    currentScript = script;
    document.documentElement.dataset.script = script;

    document.querySelectorAll('[data-script-btn]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.scriptBtn === script));
    });

    try { localStorage.setItem(STORE_SCRIPT, script); } catch (e) { /* приватни режим */ }
  }

  function initScript() {
    let saved = null;
    try { saved = localStorage.getItem(STORE_SCRIPT); } catch (e) { /* noop */ }

    document.querySelectorAll('[data-script-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () { setScript(btn.dataset.scriptBtn); });
      btn.setAttribute('aria-pressed', String(btn.dataset.scriptBtn === 'cyr'));
    });

    if (saved === 'lat') setScript('lat');
  }

  /* ======================================================== 2. ТЕМА ====== */

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Дневно читање' : 'Ноћно читање');
      const sun = btn.querySelector('[data-icon-sun]');
      const moon = btn.querySelector('[data-icon-moon]');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? '' : 'none';
        moon.style.display = theme === 'dark' ? 'none' : '';
      }
    });
    try { localStorage.setItem(STORE_THEME, theme); } catch (e) { /* noop */ }
  }

  function initTheme() {
    const current = document.documentElement.dataset.theme || 'light';
    applyTheme(current);
    document.querySelectorAll('[data-theme-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
      });
    });
  }

  /* ================================================== 3. НАВИГАЦИЈА ====== */

  function initNav() {
    const nav = document.querySelector('[data-nav]');
    if (nav) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      nav.parentNode.insertBefore(sentinel, nav);
      new IntersectionObserver(function (entries) {
        nav.classList.toggle('nav--stuck', !entries[0].isIntersecting);
      }, { rootMargin: '0px' }).observe(sentinel);
    }

    const drawer = document.querySelector('[data-drawer]');
    const burger = document.querySelector('[data-burger]');
    const drawerClose = document.querySelector('[data-drawer-close]');

    function toggleDrawer(open) {
      if (!drawer) return;
      drawer.dataset.open = String(open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (burger) burger.setAttribute('aria-expanded', String(open));
    }
    if (burger) burger.addEventListener('click', function () { toggleDrawer(drawer.dataset.open !== 'true'); });
    if (drawerClose) drawerClose.addEventListener('click', function () { toggleDrawer(false); });

    const overlay = document.querySelector('[data-search-overlay]');
    const searchBtns = document.querySelectorAll('[data-search]');
    const searchClose = document.querySelector('[data-search-close]');

    function toggleSearch(open) {
      if (!overlay) return;
      overlay.dataset.open = String(open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        const field = overlay.querySelector('input');
        if (field) setTimeout(function () { field.focus(); }, 40);
      }
    }
    searchBtns.forEach(function (b) { b.addEventListener('click', function () { toggleSearch(true); }); });
    if (searchClose) searchClose.addEventListener('click', function () { toggleSearch(false); });
    if (overlay) {
      overlay.addEventListener('click', function (e) { if (e.target === overlay) toggleSearch(false); });
      const form = overlay.querySelector('form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          const hint = overlay.querySelector('[data-search-msg]');
          if (hint) hint.textContent = 'Претрага је у прототипу приказна — у изради се повезује на архиву.';
        });
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { toggleDrawer(false); toggleSearch(false); }
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        toggleSearch(true);
      }
    });
  }

  /* ==================================================== 4. НАПРЕДАК ====== */

  function initProgress() {
    const bar = document.querySelector('[data-progress]');
    const target = document.querySelector('[data-progress-target]');
    if (!bar || !target) return;

    function update() {
      const rect = target.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      bar.style.width = (total > 0 ? (done / total) * 100 : 0) + '%';
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  }

  /* ====================================================== 5. ДАТУМ ====== */

  const DAYS = ['недеља', 'понедељак', 'уторак', 'среда', 'четвртак', 'петак', 'субота'];
  const MONTHS = ['јануара', 'фебруара', 'марта', 'априла', 'маја', 'јуна',
                  'јула', 'августа', 'септембра', 'октобра', 'новембра', 'децембра'];
  const MONTHS_SHORT = ['јануар', 'фебруар', 'март', 'април', 'мај', 'јун',
                        'јул', 'август', 'септембар', 'октобар', 'новембар', 'децембар'];

  function initDate() {
    const now = new Date();

    const greg = document.querySelector('[data-date-greg]');
    if (greg) {
      greg.textContent = DAYS[now.getDay()] + ', ' + now.getDate() + '. ' +
        MONTHS[now.getMonth()] + ' ' + now.getFullYear() + '.';
    }

    /* јулијански календар — тренутно 13 дана иза грегоријанског */
    const jul = document.querySelector('[data-date-jul]');
    if (jul) {
      const j = new Date(now.getTime());
      j.setDate(j.getDate() - 13);
      jul.textContent = j.getDate() + '. ' + MONTHS_SHORT[j.getMonth()];
    }
  }

  /* ================================================ 6. ПОЈАВЉИВАЊЕ ====== */

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* =================================================== 7. ОБРАСЦИ ====== */

  function initForms() {
    document.querySelectorAll('[data-demo-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const note = form.parentElement.querySelector('[data-form-msg]');
        if (note) note.textContent = 'Хвала — у прототипу пријава није повезана са базом.';
        form.reset();
      });
    });
  }

  /* ========================================================= START ====== */

  function start() {
    initScript();
    initTheme();
    initNav();
    initProgress();
    initDate();
    initReveal();
    initForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
