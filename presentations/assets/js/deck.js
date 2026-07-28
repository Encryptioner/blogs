/*!
 * deck.js — shared slide-deck controller for presentations/
 *
 * One engine, two canvas styles. Each deck wires up via Deck.mount({...}):
 *
 *   Deck.mount({
 *     slide: '.slide',            // slide selector
 *     reveal: 'attr',             // 'attr' (data-active + data-state="prev") | 'class' (.active/.prev)
 *     canvas: null,               // null = fluid (deck handles its own layout)
 *                                 // {w:1280,h:720} = fixed canvas, scaled to viewport via fitStage
 *     stage:   '#stageWrap',      // required when canvas is fixed (the element to scale)
 *     viewport:'#viewport',       // click-advance + swipe target (default: document)
 *     progress:'#progress', curNum:'#curNum', totalNum:'#totalNum',
 *     counter:'#counter', curTitle:'#curTitle',
 *     hash:true, clickAdvance:true, swipe:true,
 *     lightbox: { toggle:'attr' },          // 'attr' (data-open) | 'class' (.open). null disables.
 *     overview:{ titleSelector:'h3.section,h1.title' },   // null disables
 *     core:{ attr:'data-core', param:'mode', label:'12-min' },  // null disables
 *     goto:{ overlay:'#gotoOverlay', input:'#gotoInput' },      // null disables
 *     notes:{ toggle:'#notesToggle', cls:'notes-mode' },        // null disables
 *     blackout:true, help:{ overlay:'#helpOverlay' },           // false/null disables
 *   });
 *
 * Buttons with [data-dk="prev|next|overview|core|notes|goto|help|fullscreen"] are auto-wired.
 * Returns { show, next, prev, first, last, total, getCurrent } and exposes window.__deck.
 */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function mount(cfg) {
    cfg = cfg || {};
    var slideSel = cfg.slide || '.slide';
    var reveal = cfg.reveal || 'attr';
    var slides = Array.prototype.slice.call(document.querySelectorAll(slideSel));
    var total = slides.length;
    if (!total) return null;

    // --- core mode (optional): filter to slides carrying data-core ---
    var core = cfg.core || null;
    var coreMode = core && new URLSearchParams(location.search).get(core.param || 'mode') === (core.queryValue || 'core');
    function coreAttr() { return core ? (core.attr || 'data-core') : null; }
    function activeList() {
      var attr = coreAttr(), list = [];
      for (var i = 0; i < total; i++) {
        if (!coreMode || slides[i].hasAttribute(attr)) list.push(i);
      }
      return list;
    }

    var els = {
      progress: cfg.progress && $(cfg.progress),
      curNum: cfg.curNum && $(cfg.curNum),
      totalNum: cfg.totalNum && $(cfg.totalNum),
      counter: cfg.counter && $(cfg.counter),
      curTitle: cfg.curTitle && $(cfg.curTitle),
    };
    if (els.totalNum) els.totalNum.textContent = total;

    var current = 0;

    // --- reveal a slide ---
    function revealSlide(idx) {
      for (var i = 0; i < total; i++) {
        var s = slides[i];
        if (reveal === 'class') { s.classList.remove('active', 'prev'); }
        s.removeAttribute('data-active');
        s.removeAttribute('data-state');
        if (i === idx) {
          s.setAttribute('data-active', 'true');
          if (reveal === 'class') s.classList.add('active');
        } else if (i < idx) {
          s.setAttribute('data-state', 'prev');
          if (reveal === 'class') s.classList.add('prev');
        }
      }
    }

    function show(idx) {
      idx = clamp(idx, 0, total - 1);
      revealSlide(idx);
      current = idx;
      var list = activeList();
      var pos = list.indexOf(idx);
      var n = String(idx + 1).padStart(2, '0');
      if (els.curNum) els.curNum.textContent = n;
      if (els.counter) {
        els.counter.textContent = coreMode
          ? ((pos + 1) + ' / ' + list.length + (core && core.label ? ' · ' + core.label.toUpperCase() : ''))
          : (n + ' / ' + total);
      }
      if (els.curTitle) {
        var t = slides[idx].getAttribute('data-title') || '';
        if (core && coreMode && core.label) t = (core.label + ' · ') + t;
        els.curTitle.textContent = t;
      }
      if (els.progress) {
        var pct = coreMode ? ((pos + 1) / list.length * 100) : ((idx + 1) / total * 100);
        els.progress.style.width = pct + '%';
      }
      try { slides[idx].scrollTop = 0; } catch (e) {}
      if (cfg.hash) history.replaceState(null, '', '#' + (idx + 1));
    }

    function next() {
      var list = activeList();
      var pos = list.indexOf(current);
      if (pos > -1 && pos < list.length - 1) show(list[pos + 1]);
      else if (pos === -1) { var nx = list.filter(function (i) { return i > current; })[0]; if (nx != null) show(nx); }
    }
    function prev() {
      var list = activeList();
      var pos = list.indexOf(current);
      if (pos > 0) show(list[pos - 1]);
      else if (pos === -1) { var pr = list.filter(function (i) { return i < current; }).pop(); if (pr != null) show(pr); }
    }
    function first() { var l = activeList(); show(l[0]); }
    function last() { var l = activeList(); show(l[l.length - 1]); }
    function getCurrent() { return current; }

    // --- fixed-canvas scaling (PPT-style fit) ---
    var stage = (cfg.canvas && cfg.stage) ? $(cfg.stage) : null;
    function fitStage() {
      if (!stage || !cfg.canvas) return;
      var scale = Math.min(window.innerWidth / cfg.canvas.w, window.innerHeight / cfg.canvas.h);
      stage.style.transform = 'scale(' + scale + ')';
    }
    if (stage) { fitStage(); window.addEventListener('resize', fitStage); window.addEventListener('orientationchange', fitStage); }

    // --- fullscreen ---
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        var p = document.documentElement.requestFullscreen();
        if (p && p.catch) p.catch(function () {});
      } else { document.exitFullscreen(); }
    }

    // --- lightbox ---
    var lb = cfg.lightbox ? {
      box: $('.dk-lightbox') || $('#lightbox'),
      img: $('#lightboxImg'),
      open: cfg.lightbox.toggle === 'class' ? function (b) { b.classList.add('open'); }
            : function (b) { b.setAttribute('data-open', 'true'); },
      close: cfg.lightbox.toggle === 'class' ? function (b) { b.classList.remove('open'); }
             : function (b) { b.removeAttribute('data-open'); },
      isOpen: cfg.lightbox.toggle === 'class' ? function (b) { return b && b.classList.contains('open'); }
              : function (b) { return b && b.getAttribute('data-open') === 'true'; },
    } : null;
    function openLightbox(src, alt) { if (!lb || !lb.box) return; lb.img.src = src; lb.img.alt = alt || ''; lb.open(lb.box); }
    function closeLightbox() { if (!lb || !lb.box) return; lb.close(lb.box); lb.img.src = ''; }
    if (lb) {
      Array.prototype.forEach.call(document.querySelectorAll('.fig img'), function (img) {
        img.addEventListener('click', function (e) { e.stopPropagation(); openLightbox(img.src, img.alt); });
      });
      lb.box.addEventListener('click', function (e) { e.stopPropagation(); closeLightbox(); });
    }

    // --- overview grid ---
    var overview = cfg.overview ? {
      overlay: $('.dk-overview') || $('#overview'),
      grid: $('.dk-overview-grid') || $('#overviewGrid'),
      titleSelector: cfg.overview.titleSelector || 'h3,h1',
    } : null;
    function buildOverview() {
      if (!overview || !overview.grid) return;
      var attr = coreAttr();
      overview.grid.innerHTML = '';
      slides.forEach(function (s, i) {
        var card = document.createElement('div');
        card.className = 'dk-overview-card';
        if (coreMode && !s.hasAttribute(attr)) card.style.opacity = '.28';
        if (s.hasAttribute(attr)) card.setAttribute('data-core', 'true');
        var h = s.querySelector(overview.titleSelector);
        var sub = h ? h.textContent.trim().slice(0, 80) : '';
        card.innerHTML = '<div class="dk-overview-num">' + String(i + 1).padStart(2, '0') + '</div>' +
                         '<div class="dk-overview-ttl">' + (s.getAttribute('data-title') || ('Slide ' + (i + 1))) + '</div>' +
                         '<div class="dk-overview-sub">' + sub + '</div>';
        card.addEventListener('click', function () {
          show(i);
          if (overview.overlay) { overview.overlay.classList.remove('open'); overview.overlay.removeAttribute('data-open'); }
        });
        overview.grid.appendChild(card);
      });
    }
    function toggleOverview() {
      if (!overview || !overview.overlay) return;
      var open = overview.overlay.classList.contains('open') || overview.overlay.getAttribute('data-open') === 'true';
      if (open) { overview.overlay.classList.remove('open'); overview.overlay.removeAttribute('data-open'); }
      else { buildOverview(); overview.overlay.classList.add('open'); overview.overlay.setAttribute('data-open', 'true'); }
    }

    // --- core toggle ---
    function toggleCore() {
      if (!core) return;
      coreMode = !coreMode;
      var btn = $('[data-dk="core"]');
      if (btn) {
        btn.textContent = coreMode ? 'Full' : 'Core';
        btn.setAttribute('aria-pressed', coreMode ? 'true' : 'false');
      }
      var list = activeList();
      if (list.indexOf(current) === -1) {
        var nx = list.filter(function (i) { return i >= current; })[0]; if (nx == null) nx = list[0];
        current = nx;
      }
      show(current);
      if (overview && (overview.overlay.classList.contains('open') || overview.overlay.getAttribute('data-open') === 'true')) buildOverview();
    }

    // --- notes / blackout / goto / help (optional) ---
    var notes = cfg.notes || null;
    function toggleNotes() {
      if (!notes) return;
      document.body.classList.toggle(notes.cls || 'notes-mode');
      var on = document.body.classList.contains(notes.cls || 'notes-mode');
      var btn = notes.toggle && $(notes.toggle);
      if (btn) btn.textContent = 'Notes: ' + (on ? 'on' : 'off');
    }
    var blackoutEl = null;
    function toggleBlackout() {
      if (!cfg.blackout) return;
      if (!blackoutEl) {
        blackoutEl = document.createElement('div');
        blackoutEl.id = 'dk-blackout';
        blackoutEl.addEventListener('click', toggleBlackout);
        document.body.appendChild(blackoutEl);
      } else { blackoutEl.remove(); blackoutEl = null; }
    }
    var gotoEl = cfg.goto || null;
    function openGoto() { if (!gotoEl) return; var o = $(gotoEl.overlay); var i = $(gotoEl.input); if (o) { o.setAttribute('data-open', 'true'); o.classList.add('open'); } if (i) { i.value = ''; i.focus(); } }
    function closeGoto() { if (!gotoEl) return; var o = $(gotoEl.overlay); if (o) { o.removeAttribute('data-open'); o.classList.remove('open'); } }
    function submitGoto() { if (!gotoEl) return; var n = parseInt(($(gotoEl.input)).value, 10); if (!isNaN(n) && n >= 1 && n <= total) show(n - 1); closeGoto(); }
    var helpEl = cfg.help || null;
    // disable goto/help if the deck configured them but has no overlay markup
    if (gotoEl && !$(gotoEl.overlay)) gotoEl = null;
    if (helpEl && !$(helpEl.overlay)) helpEl = null;
    function toggleHelp() { if (!helpEl) return; var o = $(helpEl.overlay); if (!o) return; var open = o.getAttribute('data-open') === 'true'; o.setAttribute('data-open', open ? 'false' : 'true'); }

    // --- [data-dk] button wiring ---
    Array.prototype.forEach.call(document.querySelectorAll('[data-dk]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        switch (b.getAttribute('data-dk')) {
          case 'next': next(); break;
          case 'prev': prev(); break;
          case 'overview': toggleOverview(); break;
          case 'core': toggleCore(); break;
          case 'notes': toggleNotes(); break;
          case 'goto': openGoto(); break;
          case 'help': toggleHelp(); break;
          case 'fullscreen': toggleFullscreen(); break;
        }
      });
    });
    // notes toggle button (Many Accounts uses an id-based toggle)
    if (notes && notes.toggle) { var nt = $(notes.toggle); if (nt) nt.addEventListener('click', function (e) { e.stopPropagation(); toggleNotes(); }); }

    // --- keyboard ---
    function inGoto() { return gotoEl && ($(gotoEl.overlay)).getAttribute('data-open') === 'true'; }
    document.addEventListener('keydown', function (e) {
      // goto input handling
      if (inGoto() && document.activeElement === $(gotoEl.input)) {
        if (e.key === 'Enter') { e.preventDefault(); submitGoto(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeGoto(); }
        return;
      }
      // help overlay open
      if (helpEl && ($(helpEl.overlay)).getAttribute('data-open') === 'true') {
        if (e.key === 'Escape' || e.key === '?' || e.key === '/') { e.preventDefault(); toggleHelp(); }
        return;
      }
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp': e.preventDefault(); prev(); break;
        case 'Home': e.preventDefault(); first(); break;
        case 'End': e.preventDefault(); last(); break;
        case 'o': case 'O': if (overview) { e.preventDefault(); toggleOverview(); } break;
        case 'c': case 'C': if (core) { e.preventDefault(); toggleCore(); } break;
        case 's': case 'S': if (notes) { e.preventDefault(); toggleNotes(); } break;
        case 'b': case 'B': if (cfg.blackout) { e.preventDefault(); toggleBlackout(); } break;
        case 'g': case 'G': if (gotoEl) { e.preventDefault(); openGoto(); } break;
        case '?': case '/': if (helpEl) { e.preventDefault(); toggleHelp(); } break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'Enter': if (e.metaKey || e.ctrlKey) { e.preventDefault(); toggleFullscreen(); } break;
        case 'Escape':
          if (lb && lb.isOpen(lb.box)) closeLightbox();
          else if (overview && (overview.overlay.classList.contains('open') || overview.overlay.getAttribute('data-open') === 'true')) { overview.overlay.classList.remove('open'); overview.overlay.removeAttribute('data-open'); }
          else if (document.fullscreenElement) document.exitFullscreen();
          break;
        default:
          if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
            var n = parseInt(e.key, 10); if (n <= total) { e.preventDefault(); show(n - 1); }
          }
      }
    });

    // --- click-to-advance on viewport ---
    var clickRoot = (cfg.viewport && $(cfg.viewport)) || document;
    var ignore = cfg.ignoreClick || 'a,button,input,.dk-nav,.dk-chrome,.dk-topbar,.dk-kbd-hint,.fig,.dk-lightbox,.dk-overview,.callout,table,.notes-toggle,.dk-help,.dk-goto';
    if (cfg.clickAdvance) {
      clickRoot.addEventListener('click', function (e) {
        if (lb && lb.isOpen(lb.box)) return;
        if (e.target.closest(ignore)) return;
        if (helpEl && ($(helpEl.overlay)).getAttribute('data-open') === 'true') return;
        if (inGoto()) return;
        var rect = clickRoot.getBoundingClientRect ? clickRoot.getBoundingClientRect() : { left: 0, width: window.innerWidth };
        var x = e.clientX - rect.left;
        if (x > rect.width / 2) next(); else prev();
      });
    }

    // --- swipe (passive) ---
    if (cfg.swipe) {
      var sx = 0;
      clickRoot.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      clickRoot.addEventListener('touchend', function (e) {
        if (lb && lb.isOpen(lb.box)) return;
        var dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
      }, { passive: true });
    }

    // --- help / goto overlay backdrop close ---
    if (helpEl) { var ho = $(helpEl.overlay); if (ho) ho.addEventListener('click', function (e) { if (e.target === ho) toggleHelp(); }); }
    if (gotoEl) { var go = $(gotoEl.overlay); if (go) go.addEventListener('click', function (e) { if (e.target === go) closeGoto(); }); }

    // --- init ---
    function loadFromHash() {
      if (!cfg.hash) { show(0); return; }
      var h = parseInt(location.hash.replace('#', ''), 10);
      if (!isNaN(h) && h >= 1 && h <= total) show(h - 1); else show(0);
    }
    window.addEventListener('hashchange', loadFromHash);
    if (coreMode) { coreMode = false; toggleCore(); } else { loadFromHash(); }

    var api = { show: show, next: next, prev: prev, first: first, last: last, total: total, getCurrent: getCurrent };
    window.__deck = api;
    return api;
  }

  window.Deck = { mount: mount };
})();
