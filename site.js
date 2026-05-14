/* ═══════════════════════════════════════════════════════════════
   Jason Boog — site renderer
   Reads /content.json once, then populates whichever page is
   currently loaded based on its <body data-page="..."> attribute.
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Tiny markdown ─────────────────────────────────────────────
  // Supports: *italic*, [text](url). HTML is escaped first.
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function md(s) {
    if (s == null) return '';
    let out = escapeHtml(s);
    // [text](url) — url is also escaped above; allow http(s), mailto, #, /
    out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, text, url) {
      return '<a href="' + url + '">' + text + '</a>';
    });
    // *italic*
    out = out.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    return out;
  }

  // ── DOM helpers ───────────────────────────────────────────────
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  // ── Header / footer (shared) ──────────────────────────────────
  function renderMasthead(content, currentPage) {
    const host = document.querySelector('[data-slot="masthead"]');
    if (!host) return;
    const nav = content.nav
      .map(function (n) {
        const cur = isCurrent(n.href, currentPage) ? ' class="is-current"' : '';
        return '<a href="' + n.href + '"' + cur + '>' + escapeHtml(n.label) + '</a>';
      })
      .join('');
    host.innerHTML =
      '<hr class="double-rule">' +
      '<h1 class="masthead-title"><a href="/">' + escapeHtml(content.site.title) + '</a></h1>' +
      '<p class="masthead-deck">' + md(content.site.deck) + '</p>' +
      '<hr class="double-rule double-rule--thin">' +
      '<nav class="masthead-nav">' + nav + '</nav>';
    document.title =
      (currentPage === 'home'
        ? content.site.title + ' — ' + content.site.tagline
        : (currentPage[0].toUpperCase() + currentPage.slice(1)) + ' — ' + content.site.title);
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && currentPage === 'home') metaDesc.setAttribute('content', content.site.metaDescription || '');
  }

  function renderFooter(content, currentPage) {
    const host = document.querySelector('[data-slot="footer"]');
    if (!host) return;
    const nav = content.nav
      .map(function (n) {
        const cur = isCurrent(n.href, currentPage) ? ' class="is-current"' : '';
        return '<a href="' + n.href + '"' + cur + '>' + escapeHtml(n.label) + '</a>';
      })
      .join('');
    const social = (content.footer && content.footer.social || [])
      .map(function (s) { return '<a href="' + escapeHtml(s.url) + '">' + escapeHtml(s.label) + '</a>'; })
      .join('');
    host.innerHTML =
      '<nav class="foot-nav">' + nav + '</nav>' +
      '<nav class="foot-social">' + social + '</nav>';
  }

  function isCurrent(href, currentPage) {
    if (currentPage === 'home') return false;
    return href.indexOf('/' + currentPage) === 0;
  }

  // ── Plate filling (image + caption) ───────────────────────────
  function applyCollection(content) {
    const col = (content.collections || []).find(function (c) { return c.id === content.activeCollection; }) || content.collections[0];
    if (!col) return;
    if (col.accent) document.documentElement.style.setProperty('--accent', col.accent);
    if (col.paper)  document.documentElement.style.setProperty('--paper',  col.paper);
    const bySlot = {};
    (col.plates || []).forEach(function (p) { bySlot[p.slot] = p; });
    // Hero: prefer the explicit "hero" slot, else daily-pick from the whole collection.
    const hero = bySlot.hero || pickDaily(col.plates || []);
    fillPlate(document.querySelector('[data-plate-slot="hero"]'), hero, true);
    document.querySelectorAll('.room[data-plate-slot]').forEach(function (room) {
      fillPlate(room, bySlot[room.dataset.plateSlot] || null, false);
    });
  }

  function pickDaily(arr) {
    if (!arr.length) return null;
    const d = new Date();
    const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return arr[key % arr.length];
  }

  function fillPlate(scope, plate, isHero) {
    if (!scope) return;
    const img = scope.querySelector('.plate-img');
    const ph  = scope.querySelector('.plate-placeholder');
    if (!plate || !plate.url) {
      if (img) { img.removeAttribute('src'); img.style.display = 'none'; }
      if (ph)  { ph.style.display = 'flex'; ph.textContent = '[ plate pending ]'; }
    } else {
      if (img) {
        img.style.display = 'block';
        img.src = plate.url;
        img.alt = (plate.title || '') + (plate.creator ? ', ' + plate.creator : '');
        img.style.objectPosition = plate.focus || 'center';
        img.onerror = function () {
          img.style.display = 'none';
          if (ph) { ph.style.display = 'flex'; ph.textContent = '[ plate not found ]'; }
        };
      }
      if (ph) ph.style.display = 'none';
    }
    if (isHero) {
      const cap = scope.querySelector('.hero-cap');
      if (cap) {
        cap.querySelector('.title').textContent = plate ? (plate.title || '—') : '—';
        const metaParts = plate ? [plate.creator, plate.year].filter(Boolean) : [];
        cap.querySelector('.meta').textContent = metaParts.length ? metaParts.join(' · ') : '—';
      }
    }
  }

  // ── Home page ─────────────────────────────────────────────────
  function renderHome(content) {
    // Books spotlight
    const booksHost = document.querySelector('[data-slot="books"]');
    if (booksHost) {
      const items = (content.books.items || [])
        .map(function (b) { return '<li><a href="' + escapeHtml(b.url) + '">' + md(b.title) + '</a></li>'; })
        .join('');
      booksHost.innerHTML =
        '<span class="kicker">' + escapeHtml(content.books.kicker || 'The Books') + '</span>' +
        '<ul class="books-list">' + items + '</ul>';
    }

    // Rooms grid
    const roomsHost = document.querySelector('[data-slot="rooms"]');
    if (roomsHost) {
      roomsHost.innerHTML = (content.rooms || []).map(function (r) {
        const pieces = (r.pieces || []).map(function (p) {
          return '<li><a href="' + escapeHtml(p.url) + '">' + md(p.title) + '</a></li>';
        }).join('');
        return '' +
          '<article class="room" data-plate-slot="' + escapeHtml(r.slot) + '">' +
          '  <figure class="room-plate">' +
          '    <div class="plate-frame">' +
          '      <div class="plate-img-wrap">' +
          '        <img class="plate-img" alt="" loading="lazy">' +
          '        <div class="plate-placeholder">[ plate pending ]</div>' +
          '      </div>' +
          '    </div>' +
          '    <figcaption class="room-cap">' + md(r.caption || '') + '</figcaption>' +
          '  </figure>' +
          '  <div class="room-head"><h3 class="room-name">' + escapeHtml(r.name) + '</h3></div>' +
          '  <p class="room-deck">' + md(r.deck || '') + '</p>' +
          '  <ul class="room-pieces">' + pieces + '</ul>' +
          '  <a href="' + escapeHtml(r.moreUrl || '#') + '" class="room-more">All of ' + escapeHtml(r.name) + '</a>' +
          '</article>';
      }).join('');
    }

    applyCollection(content);

    // Pull quote
    const q = (content.quotes || [])[Math.floor(Math.random() * (content.quotes || []).length)];
    const qText = document.getElementById('quote-text');
    const qAttr = document.getElementById('quote-attr');
    if (qText && q) qText.innerHTML = '“' + md(q.text) + '”';
    if (qAttr && q) qAttr.innerHTML = '— ' + md(q.attr);
  }

  // ── About page ────────────────────────────────────────────────
  function renderAbout(content) {
    const a = content.about || {};
    const head = document.querySelector('[data-slot="interior-head"]');
    if (head) {
      head.innerHTML =
        '<span class="kicker">' + escapeHtml(a.kicker || 'About') + '</span>' +
        '<h1>' + md(a.headline || '') + '</h1>' +
        (a.deck ? '<p class="deck">' + md(a.deck) + '</p>' : '');
    }
    const grid = document.querySelector('[data-slot="about-grid"]');
    if (grid) {
      const side = (a.locationStamp || []).map(escapeHtml).join('<br>');
      const prose = (a.paragraphs || []).map(function (p) { return '<p>' + md(p) + '</p>'; }).join('');
      grid.innerHTML =
        '<aside class="col-side">' + side + '</aside>' +
        '<div class="interior-prose">' + prose + '</div>';
    }
  }

  // ── Resume page ───────────────────────────────────────────────
  function renderResume(content) {
    const r = content.resume || {};
    const head = document.querySelector('[data-slot="interior-head"]');
    if (head) {
      head.innerHTML =
        '<span class="kicker">' + escapeHtml(r.kicker || 'Resume') + '</span>' +
        '<h1>' + md(r.headline || '') + '</h1>' +
        (r.deck ? '<p class="deck">' + md(r.deck) + '</p>' : '');
    }
    const host = document.querySelector('[data-slot="resume-sections"]');
    if (host) {
      host.innerHTML = (r.sections || []).map(function (sec) {
        const entries = (sec.entries || []).map(function (e) {
          const desc = e.description ? '<p>' + md(e.description) + '</p>' : '';
          return '' +
            '<div class="cv-entry">' +
            '  <span class="yr">' + escapeHtml(e.year || '') + '</span>' +
            '  <div>' +
            '    <h3>' + md(e.title || '') + '</h3>' +
            (e.org ? '    <div class="org">' + md(e.org) + '</div>' : '') +
            desc +
            '  </div>' +
            '</div>';
        }).join('');
        return '<div class="cv-section"><h2>' + escapeHtml(sec.heading || '') + '</h2>' + entries + '</div>';
      }).join('');
    }
  }

  // ── Contact page ──────────────────────────────────────────────
  function renderContact(content) {
    const c = content.contact || {};
    const head = document.querySelector('[data-slot="interior-head"]');
    if (head) {
      head.innerHTML =
        '<span class="kicker">' + escapeHtml(c.kicker || 'Letters') + '</span>' +
        '<h1>' + md(c.headline || '') + '</h1>' +
        (c.deck ? '<p class="deck">' + md(c.deck) + '</p>' : '');
    }
    const host = document.querySelector('[data-slot="contact-grid"]');
    if (host) {
      host.innerHTML = (c.cards || []).map(function (card) {
        return '' +
          '<div class="contact-card">' +
          '  <span class="kicker">' + escapeHtml(card.kicker || '') + '</span>' +
          '  <div class="h"><a href="' + escapeHtml(card.url || '#') + '">' + escapeHtml(card.headline || '') + '</a></div>' +
          (card.description ? '  <p>' + md(card.description) + '</p>' : '') +
          '</div>';
      }).join('');
    }
  }

  // ── Bootstrap ─────────────────────────────────────────────────
  async function loadContent() {
    // Cache-bust so edits show up on the next page load.
    const url = '/content.json?t=' + Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error('content.json failed: ' + res.status);
    return res.json();
  }

  async function init() {
    const page = (document.body.dataset.page || 'home').toLowerCase();
    let content;
    try {
      content = await loadContent();
    } catch (e) {
      console.error(e);
      return;
    }
    window.__SITE = content; // for debugging
    renderMasthead(content, page);
    renderFooter(content, page);
    if (page === 'home')    renderHome(content);
    if (page === 'about')   renderAbout(content);
    if (page === 'resume')  renderResume(content);
    if (page === 'contact') renderContact(content);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
