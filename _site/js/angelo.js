var isMenuOpen = false;

// Belt-and-braces on top of the viewport meta's maximum-scale=1: this is an
// SPA (folio() swaps #content via AJAX, no real page load), so if a mobile
// browser ever widens its layout viewport to fit a deliberately-wide page
// (Kuva's pinned 1400px canvas), that wider viewport can persist across
// in-app navigation back to a normal page instead of resetting the way it
// would on a real reload. Toggling the meta tag's content forces most
// mobile browsers to recompute it from scratch.
function resetViewportZoom() {
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  var content = meta.getAttribute('content');
  var parent = meta.parentNode;
  var next = meta.nextSibling;
  // Detach and re-insert (not just re-set the same attribute value) — this
  // is the version of the trick that reliably makes mobile browsers actually
  // recompute the viewport rather than no-op on an unchanged attribute.
  parent.removeChild(meta);
  if (next) parent.insertBefore(meta, next); else parent.appendChild(meta);
  meta.setAttribute('content', content);
}

// ── Intro scramble ──
// Every character cycles random glyphs, then locks into its final letter.
// Both lines run at once, and each character picks its own random moment to
// land rather than sweeping across — a left-to-right wipe reads as mechanical.
// Letters keep their fixed-width slots after the intro so hovering one can
// re-shuffle it without shifting anything around it.
var SCRAMBLE_GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*<>/\\{}[]()=+-?@";

function randGlyph() {
  return SCRAMBLE_GLYPHS.charAt(Math.floor(Math.random() * SCRAMBLE_GLYPHS.length));
}

// Intros waiting for their line to be on screen: a page opened straight onto
// /ai.html or /about.html hides the homepage intro, and slots measured while
// hidden all come out 0px wide, stacking every letter on top of the next.
// hideLanding runs them once the intro is showing again.
var _pendingScrambles = [];

function scrambleText(el, duration) {
  if (!el) return;
  // Measure once webfonts are in, otherwise slot widths get sized off the
  // fallback face and everything shifts when the real font swaps in.
  var run = function () {
    if (!el.getClientRects().length) { _pendingScrambles.push([el, duration]); return; }
    runScramble(el, duration);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  else run();
}

function runScramble(el, duration) {
  var chars = el.textContent.split('');
  var n = chars.length;
  var i;

  // One fixed-width slot per character, sized to that character's FINAL glyph.
  // In a proportional face a random glyph is rarely the same width as the one
  // it stands in for, so without pinned slots every frame relays out the line
  // and the whole headline jitters. Spaces stay real text nodes so the line
  // still wraps and copies normally — but each word's letter-spans also need
  // a shared nowrap wrapper, or the browser treats the gap BETWEEN adjacent
  // inline-block spans as a break opportunity too, wrapping mid-word.
  el.textContent = '';
  var slots = [];
  var wordWrap = null;
  for (i = 0; i < n; i++) {
    if (chars[i] === ' ') {
      el.appendChild(document.createTextNode(' '));
      slots.push(null);
      wordWrap = null;
      continue;
    }
    if (!wordWrap) {
      wordWrap = document.createElement('span');
      wordWrap.style.whiteSpace = 'nowrap';
      el.appendChild(wordWrap);
    }
    var s = document.createElement('span');
    s.textContent = chars[i];
    s.style.display = 'inline-block';
    s.style.textAlign = 'center';
    s.style.filter = 'blur(8px)';
    s.style.opacity = '0.35';
    wordWrap.appendChild(s);
    slots.push(s);
  }
  // Measure all, then write all — interleaving would force a reflow per slot.
  var widths = slots.map(function (sp) {
    return sp ? sp.getBoundingClientRect().width : 0;
  });
  for (i = 0; i < n; i++) {
    if (slots[i]) slots[i].style.width = widths[i] + 'px';
  }

  // Scattered landing times: nothing resolves in the first 15%, then each
  // character lands whenever its own number comes up.
  var revealAt = [];
  for (i = 0; i < n; i++) {
    revealAt[i] = duration * (0.15 + Math.random() * 0.85);
    if (slots[i]) slots[i].textContent = randGlyph();
  }

  // Glyphs churn on their own slower clock — rerolling every frame reads as mush.
  var GLYPH_MS = 45;
  var locked = new Array(n);
  var lastRoll = -Infinity;
  var start = null;
  var finished = false;

  function frame(now) {
    if (finished) return;
    if (start === null) start = now;
    var t = now - start;
    var roll = (t - lastRoll) >= GLYPH_MS;
    if (roll) lastRoll = t;

    var done = true;
    for (var k = 0; k < n; k++) {
      if (locked[k] || !slots[k]) continue;
      if (t >= revealAt[k]) {
        slots[k].textContent = chars[k];
        slots[k].style.filter = 'blur(0px)';
        slots[k].style.opacity = '1';
        locked[k] = true;
        continue;
      }
      done = false;
      // Blur/opacity ease in gradually across this letter's own countdown to
      // lock — starts resolving from frame one of the scramble, not just in
      // the instant it settles.
      var progress = t / revealAt[k];
      slots[k].style.filter = 'blur(' + (8 * (1 - progress)) + 'px)';
      slots[k].style.opacity = 0.35 + 0.65 * progress;
      if (roll) slots[k].textContent = randGlyph();
    }

    if (done) { finalize(); return; }
    requestAnimationFrame(frame);
  }

  // rAF is paused entirely while the tab is backgrounded, which would leave the
  // headline sitting in random glyphs and — worse — never bind the hover
  // handlers. setTimeout still fires there, so use it as a safety net.
  function finalize() {
    if (finished) return;
    finished = true;
    for (var j = 0; j < n; j++) {
      if (!slots[j]) continue;
      slots[j].textContent = chars[j];
      slots[j].style.filter = 'blur(0px)';
      slots[j].style.opacity = '1';
      attachHoverScramble(slots[j], chars[j]);
    }
  }

  requestAnimationFrame(frame);
  setTimeout(finalize, duration + 800);
}

// Re-shuffle a single letter on hover. The slot keeps its pinned width, so the
// substitute glyphs can't push the rest of the line around.
function attachHoverScramble(slot, finalChar) {
  var busy = false;
  slot.addEventListener('mouseenter', function () {
    if (busy) return;
    busy = true;
    slot.style.filter = 'blur(4px)';
    slot.style.opacity = '0.4';
    var DUR = 450, GLYPH_MS = 40, last = -Infinity, t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var t = now - t0;
      if (t >= DUR) { slot.textContent = finalChar; slot.style.filter = 'blur(0px)'; slot.style.opacity = '1'; busy = false; return; }
      var progress = t / DUR;
      slot.style.filter = 'blur(' + (4 * (1 - progress)) + 'px)';
      slot.style.opacity = 0.4 + 0.6 * progress;
      if (t - last >= GLYPH_MS) { slot.textContent = randGlyph(); last = t; }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function initIntroScramble(duration) {
  duration = duration || 1800;
  var a = document.getElementById('shuffle1');
  var b = document.getElementById('shuffle2');
  // #shuffle2 sits at opacity 0 until revealed — it used to wait for line 1.
  if (b) b.classList.add('showshuffle');
  scrambleText(a, duration);
  scrambleText(b, duration);
}

// ── Phone menu (burger) ──
function toggleNavMenu(e, force) {
  if (e) e.stopPropagation();
  var menu = document.getElementById('fb-menu');
  var btn = document.querySelector('.fb-burger');
  if (!menu || !btn) return;
  var open = force !== undefined ? force : !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
// closes on a tap outside, on Escape, and after choosing a link (the theme
// row keeps it open so the switch can be seen)
document.addEventListener('click', function(e) {
  var menu = document.getElementById('fb-menu');
  if (!menu || !menu.classList.contains('is-open')) return;
  if (!menu.contains(e.target) || e.target.closest('a')) toggleNavMenu(null, false);
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') toggleNavMenu(null, false);
});

// ── Night mode ──
// The corner button's icon: a sun core with 8 ray dots; in dark mode a mask
// circle slides over the core to leave a crescent and the rays shrink away
// (all CSS transitions on .tt-*, see style.css). Built here so the 43 page
// shells keep their plain <span class="tt-dot"> placeholder.
function initThemeIcon() {
  var dot = document.querySelector('#theme-toggle .tt-dot');
  if (!dot) return;
  var rays = '';
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4 - Math.PI / 2;
    rays += '<circle style="--i:' + i + '" cx="' + (12 + 9 * Math.cos(a)).toFixed(2) + '" cy="' + (12 + 9 * Math.sin(a)).toFixed(2) + '" r="1.7"/>';
  }
  var wrap = document.createElement('span');
  wrap.innerHTML =
    '<svg class="tt-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<mask id="tt-moon-mask" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">' +
        '<rect x="-4" y="-4" width="32" height="32" fill="#fff"/>' +
        '<circle class="tt-cut" cx="16.6" cy="7.6" r="6.2" fill="#000"/>' +
      '</mask>' +
      // mask on a group, not the core: the core scales up and would scale its mask with it
      '<g mask="url(#tt-moon-mask)"><circle class="tt-core" cx="12" cy="12" r="5" fill="currentColor"/></g>' +
      '<g class="tt-rays" fill="currentColor">' + rays + '</g>' +
    '</svg>';
  dot.replaceWith(wrap.firstChild);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initThemeIcon);
else initThemeIcon();

var _themingT = null;
function toggleTheme() {
  var root = document.documentElement;
  root.classList.add('theming');           // enables the crossfade
  root.classList.toggle('dark');
  try {
    localStorage.setItem('theme', root.classList.contains('dark') ? 'dark' : 'light');
  } catch (e) {}
  // repaint the progress ring with the new palette
  var c = document.getElementById('content');
  if (c) c.dispatchEvent(new Event('scroll'));
  // a stale timer from a rapid double-toggle would cut the crossfade short
  clearTimeout(_themingT);
  _themingT = setTimeout(function() { root.classList.remove('theming'); }, 600);
}

// ── Close button tooltip ──
// Mounted on body as position:fixed so #content's overflow-x:hidden can't clip it.
function initCloseTip() {
  var old = document.getElementById('close-kbd-tip');
  if (old) old.remove();

  var btn = document.getElementById('scroll-progress');
  if (!btn) return;

  var dark = document.documentElement.classList.contains('dark');
  var tip = document.createElement('div');
  tip.id = 'close-kbd-tip';
  tip.className = 'kbd-tip';
  tip.innerHTML = '<span class="kbd-tip-label">Close</span><kbd>ESC</kbd>';
  tip.style.cssText = 'position:fixed;opacity:0;pointer-events:none;z-index:9999;transition:opacity 0.18s ease,transform 0.18s ease;';
  document.body.appendChild(tip);

  // Below the button, right-aligned to its right edge — same convention as
  // the About/Theme-toggle tips (see #about .kbd-tip in style.css).
  function position() {
    var r = btn.getBoundingClientRect();
    var tw = tip.offsetWidth;
    tip.style.top  = Math.round(r.bottom + 10) + 'px';
    tip.style.left = Math.round(r.right - tw) + 'px';
  }

  var showT = null;
  btn.addEventListener('mouseenter', function() {
    clearTimeout(showT);
    showT = setTimeout(function() {
      position();
      tip.style.opacity = '1';
    }, 450);
  });
  btn.addEventListener('mouseleave', function() {
    clearTimeout(showT);
    tip.style.opacity = '0';
  });
}

// ── Work grid ──
// One masonry instance per section grid (Selected work, Older work, Other).
var MASONRY_OPTS = {
  itemSelector: '.item',
  columnWidth: 230,
  gutterWidth: 10,
  isFitWidth: true,
  isAnimated: true,
  animationOptions: { duration: 500, easing: 'easeInOutCubic', queue: true }
};

// The 230px column is a desktop constant: two of them plus a 10px gutter need
// 470px, so on a ~380px phone grid masonry fitted exactly ONE column and
// centred it, leaving the dead space beside it that started all of this.
//
// Below this width the column is derived from the grid instead, so it always
// lands on 2 columns. Masonry itself keeps running — it's the only thing that
// packs ragged-height cards without leaving holes under the short ones, which
// a flex-wrap layout (every row as tall as its tallest card) cannot do.
//
// The value has to match the CSS `.item { width: calc(50% - 5px) }` in the
// max-width:500px block, hence measuring a real card when one is available
// rather than trusting the arithmetic twice.
function isNarrowGrid() { return window.innerWidth <= 500; }

function gridColumnOptions($grid, animated) {
  var opts = $.extend({}, MASONRY_OPTS, { isAnimated: !!animated });
  if (!isNarrowGrid()) return opts;

  var $std = $grid.find('.item').not('.showhide').filter(function() {
    return (this.getAttribute('style') || '').indexOf('470px') === -1;
  }).first();

  var avail = $grid.parent().width() || $grid.width() || 0;
  var measured = $std.length ? Math.round($std.outerWidth()) : 0;
  var col = measured > 1 ? measured
                         : Math.floor((avail - opts.gutterWidth) / 2);

  opts.columnWidth = Math.max(1, col);
  // isFitWidth shrink-wraps the container to whole columns and centres it —
  // the exact behaviour that stranded a single column on a phone. Off here so
  // the grid simply fills its parent.
  opts.isFitWidth = false;
  return opts;
}

function initWorkGrids(animated) {
  $('.work-grid').each(function() {
    var $g = $(this);
    $g.masonry(gridColumnOptions($g, animated));
  });
  watchGridBreakpoint();
}

// Masonry re-layouts on window resize by itself, but it reuses whatever
// columnWidth it was initialised with — so crossing the breakpoint (rotating a
// phone, dragging a desktop window narrow) would keep the wrong column count
// until a reload. Re-derive the options when the narrow/wide state flips.
function watchGridBreakpoint() {
  if (watchGridBreakpoint._bound) return;
  watchGridBreakpoint._bound = true;

  var wasNarrow = isNarrowGrid();
  var t = null;
  window.addEventListener('resize', function() {
    clearTimeout(t);
    t = setTimeout(function() {
      var now = isNarrowGrid();
      if (now === wasNarrow) return;
      wasNarrow = now;
      $('.work-grid').each(function() {
        var $g = $(this);
        if (!$g.hasClass('masonry')) return;   // never initialised; nothing to redo
        $g.masonry('option', $.extend(gridColumnOptions($g, false), { isAnimated: false }));
        $g.masonry('reload');
      });
    }, 180);
  });
}

// Pre-pass, called from every page's inline $(window).load: compresses the
// grid to a 2-column layout while it's still hidden so the cascade has varied
// x+y start positions to animate out of. Lived inline in all 39 HTML files;
// it's a function here so the width handling lives in exactly one place.
// Skipped on narrow screens — the 470px column it uses to force 2 desktop
// columns is wider than the whole grid there, and the layout below reruns
// immediately anyway.
function initWorkGridsPrepass() {
  if (isNarrowGrid()) return;
  $('.work-grid').masonry({ columnWidth: 470, isFitWidth: false, isAnimated: false });
}

// Called from the loader fade-out in every page's inline script: lays the grid
// out instantly so runCascade has real positions to reveal from.
function layoutWorkGridsInstant() {
  $('.work-grid').each(function() {
    var $g = $(this);
    $g.masonry(gridColumnOptions($g, false));
  });
}

// Hands animation back to masonry once the entrance cascade is done, so
// columns slide on window resize instead of snapping.
function enableWorkGridAnimation() {
  $('.work-grid').masonry('option', {
    isAnimated: true,
    animationOptions: { queue: false, duration: 500, easing: 'easeInOutCubic' }
  });
}

// ── Work sections ──
// Two scopes, swapped by the quick-filter dropdown next to the About icon:
//   'product' — Selected work + Older work (first 6, rest behind Show more)
//   'other'   — everything that isn't product work, as one full-width grid
// Each scope is a set of <section class="work-scope-*">; switching hides one
// set and reveals the other, then cascades the incoming cards in.
var _activeScope = 'product';   // must match which sections lack .section-hidden
var _scopeToken = 0;            // rapid switches: later runs invalidate earlier
var _olderExpanded = false;

function setScope(scope) {
  if (scope === _activeScope) return;
  _activeScope = scope;
  syncQuickFilter(scope);
  document.title = scope === 'product' ? 'Angelo Wellens | Product Work' : 'Angelo Wellens | Other design work';
  var token = ++_scopeToken;

  var $in  = $(scope === 'product' ? '.work-scope-product' : '.work-scope-other');
  var $out = $(scope === 'product' ? '.work-scope-other' : '.work-scope-product');
  var $outItems = $out.find('.item').not('.showhide');

  // outgoing cards shrink away first, so the swap has somewhere to go
  $outItems.css({
    transition: 'opacity 0.18s ease, transform 0.18s ease',
    opacity: 0,
    transform: 'scale(0.94)'
  });

  setTimeout(function() {
    if (token !== _scopeToken) return;

    $out.addClass('section-hidden');
    $outItems.css({ transition: '', opacity: '', transform: '' });
    $in.removeClass('section-hidden');

    // a grid laid out while its section was display:none measured zero wide,
    // so it needs a relayout now that it actually has a width
    $in.find('.work-grid').each(function(gi) {
      var $g = $(this);
      // re-derive columnWidth: this grid was display:none until a moment ago,
      // so it measured zero wide and any width cached from then is wrong
      $g.masonry('option', $.extend(gridColumnOptions($g, false), { isAnimated: false }));
      $g.masonry('reload');
      $g.masonry('option', { isAnimated: true });
      // stagger the second section so the two cascade in order, not together
      runCascade($g.find('.item').not('.showhide'), $g, gi * 180);
    });
  }, 190);
}

// Older work ships 6 cards; the rest carry .older-extra and sit behind the
// button. No FLIP needed either way — masonry places bricks in order, so
// adding or removing trailing cards never moves the ones already placed.
function toggleOlderMore() {
  _olderExpanded = !_olderExpanded;

  var $g = $('#grid-older');
  var $extra = $g.find('.item.older-extra');
  var btn = document.getElementById('older-more-btn');
  if (btn) btn.textContent = _olderExpanded ? 'Show less' : 'Show more';

  function relayout() {
    $g.masonry('option', $.extend(gridColumnOptions($g, false), { isAnimated: false }));
    $g.masonry('reload');
    $g.masonry('option', { isAnimated: true });
  }

  if (_olderExpanded) {
    // relayout first so the cards have real positions, then run the same
    // top-centre cascade as the page load and the scope switch
    $extra.removeClass('showhide').css({ transition: 'none', opacity: 0 });
    relayout();
    runCascade($extra, $g);
  } else {
    $extra.css({
      transition: 'opacity 0.18s ease, transform 0.18s ease',
      opacity: 0,
      transform: 'scale(0.94)'
    });
    setTimeout(function() {
      $extra.addClass('showhide').css({ transition: '', opacity: '', transform: '' });
      relayout();
    }, 190);
  }
}

// Parks each card up near the grid's top centre so it can spread out into its
// real position — the swap equivalent of the page-load "fall into place".
// Must run after masonry has relaid out, since it reads final positions.
// Pull is partial (0.55) rather than all the way to the centre: a full gather
// makes cards on the far edges travel absurdly far and read as a swoosh.
function cascadeInFrom($items, $grid, baseDelay) {
  baseDelay = baseDelay || 0;
  var gw = $grid.width() || 1;
  var gh = $grid.height() || 1;
  $items.each(function() {
    var $c = $(this);
    var pos = $c.position();
    var cx = pos.left + ($c.outerWidth() / 2);
    var dx = Math.round((gw / 2 - cx) * 0.55);
    var dy = Math.round(-pos.top * 0.55 - 90);
    // fan out left-to-right, top-to-bottom, same feel as the load cascade
    var delay = baseDelay + Math.round((pos.left / gw) * 260 + (pos.top / gh) * 420);
    $c.data('cascadeDelay', delay);
    $c.css({
      transition: 'none',
      opacity: 0,
      transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.94)'
    });
  });
}

// Lets cards parked by cascadeInFrom go, each waiting out its own stagger.
function cascadeRelease($items) {
  $items.each(function() {
    var d = $(this).data('cascadeDelay') || 0;
    $(this).css({
      transition: 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1) ' + d + 'ms, ' +
                  'opacity 0.5s ease ' + d + 'ms',
      opacity: 1,
      transform: 'none'
    });
  });
}

// Park + release + clean up in one call. Used by both entrances: the
// page-load reveal and the scope switch, so the two look identical.
function runCascade($items, $grid, baseDelay) {
  if (!$items || !$items.length || !$grid || !$grid.length) return;
  cascadeInFrom($items, $grid, baseDelay);
  requestAnimationFrame(function() { requestAnimationFrame(function() {
    cascadeRelease($items);
    // last card only starts once its stagger elapses, so clear well after
    setTimeout(function() {
      $items.css({ transition: '', opacity: '', transform: '' });
    }, 1800);
  }); });
}

// ── Quick filter dropdown ──
// Custom menu, not a native <select> — the open <select> list is drawn by the
// OS and can't be styled to match the rest of the site.
function toggleQuickFilter() {
  var el = document.getElementById('quick-filter');
  if (!el) return;
  var open = el.classList.toggle('is-open');
  el.querySelector('.qf-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeQuickFilter() {
  var el = document.getElementById('quick-filter');
  if (!el || !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  el.querySelector('.qf-toggle').setAttribute('aria-expanded', 'false');
}

function selectQuickFilter(cat, btn) {
  closeQuickFilter();
  leaveLanding();   // picking work from the AI or About page goes back to the grid

  syncQuickFilter(cat, btn);
  setScope(cat);
}

// Split button: the label goes to the work grid with the current choice, the
// arrow beside it (toggleQuickFilter) opens the menu to change that choice.
// Every click replays the tile entrance, like a reload: back to the top, then
// the visible grids cascade in again (the second one staggered after the first,
// as in setScope).
function goToWork() {
  closeQuickFilter();
  if (_landing) leaveLanding();
  else window.scrollTo(0, 0);
  replayWorkCascade();
}

function replayWorkCascade() {
  var token = ++_scopeToken;   // a scope switch in flight shouldn't fight this
  var $grids = $(_activeScope === 'product' ? '.work-scope-product' : '.work-scope-other').find('.work-grid');
  requestAnimationFrame(function() {
    if (token !== _scopeToken) return;
    $grids.each(function(gi) {
      var $g = $(this);
      runCascade($g.find('.item').not('.showhide').filter(':visible'), $g, gi * 180);
    });
  });
}

function leaveLanding() {
  if (!_landing) return;
  var title = 'Angelo Wellens | Product Work';
  window.history.pushState({ title: title, url: '/' }, title, '/');
  document.title = title;
  hideLanding();
  window.scrollTo(0, 0);
}

// keeps the button label + option checkmark in sync, whether the change came
// from this menu or from a pill click on 'selected'/'all' down in the grid
function syncQuickFilter(cat, btn) {
  var el = document.getElementById('quick-filter');
  if (!el) return;
  if (!btn) btn = el.querySelector('.qf-option[data-cat="' + cat + '"]');
  if (!btn) return;
  el.querySelector('.qf-label').textContent = btn.textContent.trim();
  el.querySelectorAll('.qf-option').forEach(function(o) {
    var on = o === btn;
    o.classList.toggle('is-selected', on);
    o.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

document.addEventListener('click', function(e) {
  var el = document.getElementById('quick-filter');
  if (el && el.classList.contains('is-open') && !el.contains(e.target)) closeQuickFilter();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeQuickFilter();
});

// ── Circle reveal ──
// The project page opens as a growing circle from the exact click point,
// like ink spreading from where you touched the grid.
var _clickPoint = null;

// Grid links used to be href="javascript:folio(...)"; they're real
// href="slug.html" URLs now (so refreshing/sharing a project link works),
// with the folio() call moved to onclick — match that instead.
document.addEventListener('click', function(e) {
  var a = e.target.closest ? e.target.closest('a[onclick^="folio("]') : null;
  if (a) _clickPoint = { x: e.clientX, y: e.clientY };
}, true);

function circleReveal() {
  var p = _clickPoint;
  _clickPoint = null;
  if (!p) return;
  var els = [document.getElementById('overlay'), document.getElementById('content')];
  // radius to the farthest viewport corner from the click point
  var r = Math.ceil(Math.hypot(
    Math.max(p.x, window.innerWidth - p.x),
    Math.max(p.y, window.innerHeight - p.y)
  ));
  els.forEach(function(el) {
    if (!el) return;
    el.style.clipPath = 'circle(0px at ' + p.x + 'px ' + p.y + 'px)';
    el.style.webkitClipPath = el.style.clipPath;
    el.style.transition = 'clip-path 0.9s cubic-bezier(0.22,1,0.36,1)';
  });
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      els.forEach(function(el) {
        if (!el) return;
        el.style.clipPath = 'circle(' + r + 'px at ' + p.x + 'px ' + p.y + 'px)';
        el.style.webkitClipPath = el.style.clipPath;
      });
    });
  });
  setTimeout(function() {
    els.forEach(function(el) {
      if (!el) return;
      el.style.clipPath = '';
      el.style.webkitClipPath = '';
      el.style.transition = '';
    });
  }, 1000);
}

// ── Parallax ──
// BG drifts slowly, top layer drifts faster — supports multiple .parallax-section elements.
var _parallaxItems = [];
var _parallaxRafRunning = false;

function initParallax() {
  _parallaxItems = [];
  document.querySelectorAll('.parallax-section').forEach(function(section) {
    var fan = section.querySelector('.phones-fan');
    _parallaxItems.push({
      section: section,
      bg:  section.querySelector('.parallax-bg'),
      top: fan ? null : section.querySelector('.parallax-top'),
      fan: fan ? {
        left:   section.querySelector('.phone-left'),
        center: section.querySelector('.phone-center'),
        right:  section.querySelector('.phone-right')
      } : null
    });
  });
  // Single free-standing image drifting horizontally as it crosses the
  // viewport — no bg/top pair, no wrapping box, just itself.
  document.querySelectorAll('.parallax-x').forEach(function(el) {
    _parallaxItems.push({ section: el, x: el });
  });
  if (_parallaxItems.length && !_parallaxRafRunning) {
    _parallaxRafRunning = true;
    parallaxLoop();
  }
}

function parallaxLoop() {
  _parallaxItems = _parallaxItems.filter(function(item) { return item.section.isConnected; });
  if (!_parallaxItems.length) {
    _parallaxRafRunning = false;
    return;
  }
  _parallaxItems.forEach(function(item) {
    var rect     = item.section.getBoundingClientRect();
    var progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
    progress = Math.max(0, Math.min(1, progress));
    var c = progress - 0.5; // -0.5 (entering) .. +0.5 (leaving)
    if (item.bg)  item.bg.style.transform  = 'translateY(' + (c * -80)  + 'px)';
    if (item.top) item.top.style.transform = 'translateY(' + (c * -240) + 'px)';
    if (item.x)   item.x.style.transform   = 'translateX(' + (c * 160)  + 'px)';
    if (item.fan) {
      var f = item.fan;
      // Center drifts straight up; side phones lift up AND spread outward as you scroll down.
      if (f.left)   f.left.style.transform   = 'translate(-50%, -42%) translate(' + (c * -90) + 'px, ' + (c * -200) + 'px) rotate(' + (-7 + c * -6) + 'deg)';
      if (f.center) f.center.style.transform = 'translate(-50%, -50%) translateY(' + (c * -190) + 'px) rotate(-1deg)';
      if (f.right)  f.right.style.transform  = 'translate(-50%, -42%) translate(' + (c * 90) + 'px, ' + (c * -200) + 'px) rotate(' + (5 + c * 6) + 'deg)';
    }
  });
  requestAnimationFrame(parallaxLoop);
}

// ── Scroll progress ring / close button (bottom-right) ──
// The arc draws around an × as the page is read; at the end the circle
// fills dark — "you're done, close me". Clicking it closes the project.
function initScrollProgress() {
  var content = document.getElementById('content');
  if (!content) return;
  var old = document.getElementById('scroll-progress');
  if (old) old.remove();

  var size = 44, stroke = 2;
  var c = size / 2;
  var r = (size - stroke) / 2;
  var circ = 2 * Math.PI * r;
  var xo = 6;   // half-size of the ×

  var el = document.createElement('div');
  el.id = 'scroll-progress';
  el.style.cssText =
    'position:fixed;right:26px;top:26px;width:' + size + 'px;height:' + size + 'px;' +
    'cursor:pointer;z-index:999;transition:transform 0.2s ease;';
  el.innerHTML =
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle class="sp-bg" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#ffffff" ' +
        'stroke="rgba(0,0,0,0.1)" stroke-width="' + stroke + '" style="transition:fill 0.3s ease;"/>' +
      '<circle class="sp-arc" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" ' +
        'stroke="#191919" stroke-width="' + stroke + '" stroke-linecap="round" ' +
        'stroke-dasharray="' + circ + '" stroke-dashoffset="' + circ + '" ' +
        'transform="rotate(-90 ' + c + ' ' + c + ')"/>' +
      '<line class="sp-x" x1="' + (c - xo) + '" y1="' + (c - xo) + '" x2="' + (c + xo) + '" y2="' + (c + xo) + '" ' +
        'stroke="#191919" stroke-width="1.25" stroke-linecap="round" style="transition:stroke 0.3s ease;"/>' +
      '<line class="sp-x" x1="' + (c + xo) + '" y1="' + (c - xo) + '" x2="' + (c - xo) + '" y2="' + (c + xo) + '" ' +
        'stroke="#191919" stroke-width="1.25" stroke-linecap="round" style="transition:stroke 0.3s ease;"/>' +
    '</svg>';
  content.appendChild(el);   // lives inside #content → removed automatically on close
  var arc = el.querySelector('.sp-arc');
  var bg = el.querySelector('.sp-bg');
  var xs = el.querySelectorAll('.sp-x');


  var complete = false, hover = false;
  function paint() {
    var filled = complete || hover;
    var dark = document.documentElement.classList.contains('dark');
    var ink = dark ? '#ececec' : '#191919';
    var paper = dark ? '#1c1c1c' : '#ffffff';
    bg.style.fill = filled ? ink : paper;
    xs.forEach(function(l) { l.style.stroke = filled ? paper : ink; });
  }

  function update() {
    var max = content.scrollHeight - content.clientHeight;
    var p = max > 0 ? content.scrollTop / max : 0;
    p = Math.max(0, Math.min(1, p));
    arc.style.strokeDashoffset = circ * (1 - p);
    complete = p > 0.985;
    paint();
  }

  el.addEventListener('mouseenter', function() { hover = true; el.style.transform = 'scale(1.08)'; paint(); });
  el.addEventListener('mouseleave', function() { hover = false; el.style.transform = ''; paint(); });
  el.addEventListener('click', function(e) {
    e.stopPropagation();   // #content click also closes — avoid double-close
    close();
  });

  content.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// ── Design approach scroll (pinned split: numbered items + crossfading image) ──
function initApproachScroll() {
  var section = document.querySelector('.approach-scroll');
  if (!section) return;
  // Below 760px the CSS drops the sticky split for a plain stacked layout
  // (see the matching @media block in atlas.html) — every item/image is
  // forced visible there, so the pin/progress math and its click-to-scroll
  // handler would only fight that with a stale, meaningless target.
  if (window.innerWidth <= 760) return;
  var pin = section.querySelector('.approach-pin');
  var items = Array.from(section.querySelectorAll('.approach-item'));
  var imgs = Array.from(section.querySelectorAll('.approach-img'));
  var n = items.length;
  var content = document.getElementById('content');
  if (!content) return;

  var STEP_VH = 55;
  section.style.height = ((n - 1) * STEP_VH + 100) + 'vh';

  var current = -1;
  var approachList = section.querySelector('.approach-list');
  var approachRight = section.querySelector('.approach-right');

  function update() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - pin.offsetHeight;
    var progress = total > 0 ? (-rect.top) / total : 0;
    progress = Math.max(0, Math.min(1, progress));

    var active = Math.min(n - 1, Math.round(progress * (n - 1)));
    if (active !== current) {
      current = active;
      items.forEach(function(el, k) { el.classList.toggle('active', k === active); });
      imgs.forEach(function(el, k) { el.classList.toggle('active', k === active); });
    }

    // Slide the list so the last item bottom aligns with the image panel bottom at progress=1
    var panelH = approachRight ? approachRight.offsetHeight : pin.offsetHeight;
    var maxY = Math.max(0, panelH - approachList.offsetHeight);
    approachList.style.transform = 'translateY(' + (progress * maxY) + 'px)';
  }

  items.forEach(function(item, k) {
    item.style.cursor = 'pointer';
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      var sectionTop = content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top;
      content.scrollTo({ top: sectionTop + k * STEP_VH * window.innerHeight / 100, behavior: 'smooth' });
    });
  });

  content.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// ── Process carousel (pinned; vertical scroll drives horizontal track travel) ──
// A real horizontal scroller: the viewport is a native overflow-x container,
// so vertical page/mouse-wheel scrolling passes straight through untouched —
// only an explicit horizontal gesture (trackpad swipe, shift+wheel) or the
// arrow buttons move the cards. Firefox is the one browser that redirects a
// plain vertical wheel into horizontal scroll on an overflow-x element, so
// that case is caught and re-issued as a normal page scroll instead.
// root: where to look — #content for a project, #landing for the About
// landing (the two can be in the DOM at once, so nothing here is looked up
// document-wide). On the landing the page itself scrolls, not #content, and
// the card column is About's .left instead of .project-details.
var _stackResize = {};
function initProcessStack(root) {
  root = root || document.getElementById('content');
  if (!root) return;
  var key = root.id;
  if (_stackResize[key]) {
    window.removeEventListener('resize', _stackResize[key]);
    delete _stackResize[key];
  }
  var section = root.querySelector('.process-stack');
  if (!section) return;
  var viewport = section.querySelector('.stack-viewport');
  var cards = Array.from(section.querySelectorAll('.stack-card'));
  var n = cards.length;
  var onLanding = key === 'landing';
  var content = onLanding ? null : document.getElementById('content');
  var wrap = root.querySelector('#wrap_project, #landing_wrap');
  var current = -1;

  var prevBtn = section.querySelector('.stack-prev');
  var nextBtn = section.querySelector('.stack-next');

  var dotsWrap = section.querySelector('.stack-dots');
  var dots = [];
  if (dotsWrap) {
    dotsWrap.innerHTML = '';
    cards.forEach(function() {
      var d = document.createElement('span');
      d.className = 'stack-dot';
      dotsWrap.appendChild(d);
      dots.push(d);
    });
  }

  var track = section.querySelector('.stack-track');

  // Card width = text column width (.project-details, max-width 780px).
  function sizeCards() {
    var details = root.querySelector(onLanding ? '.left' : '.project-details');
    var cw = details ? details.clientWidth : (wrap ? wrap.clientWidth : viewport.clientWidth);
    cards.forEach(function(c) { c.style.width = Math.round(cw) + 'px'; });
  }

  // The viewport is full-bleed (100vw) but the reading column isn't, so
  // centering a card in the viewport — the original approach — leaves a big
  // gap before card 0 and swings every step across nearly the whole screen.
  // Aligning to the column's left edge instead keeps every card (including
  // the first) flush with the surrounding copy, with the next one just
  // peeking in from the right — matching the "sized/aligned to the content
  // column" comment on .process-stack above, and reads much calmer.
  //
  // That alignment needs actual scroll room to reach, though: getting card 0
  // flush means scrolling to a negative position (padding-left worth of
  // travel), which scrollLeft can never go below — it just clamps to 0,
  // stranding card 0 against the full-bleed edge instead. Padding-left on
  // the track gives the scroller that room at the start, and it works
  // reliably because leading padding always counts toward scrollWidth.
  //
  // Trailing padding doesn't get the same guarantee — browsers are
  // inconsistent about whether end-side padding on a scroll container
  // contributes to its scrollable range, and here it measurably didn't
  // (maxScroll came up short by exactly one inset, stranding the last card
  // the same way card 0 was stranded). A real spacer element at the end
  // always counts, so that's what provides the room on that side instead.
  // Aligned to .breakout (the page's other full-bleed media — gif grids,
  // hero shots), not .project-details itself: .breakout already has an
  // established, deliberate bleed past the text column, and matching that
  // reads as consistent with the rest of the page rather than looking
  // arbitrarily narrower or wider than everything else that breaks out.
  function contentInset() {
    var ref = onLanding ? root.querySelector('.left')
      : (root.querySelector('.breakout') || root.querySelector('.project-details'));
    if (!ref) return 0;
    return Math.max(0, ref.getBoundingClientRect().left - viewport.getBoundingClientRect().left);
  }

  function endSpacer() {
    var el = track.querySelector('.stack-spacer');
    if (!el) {
      el = document.createElement('div');
      el.className = 'stack-spacer';
      el.style.flex = '0 0 auto';
      el.setAttribute('aria-hidden', 'true');
      track.appendChild(el);
    }
    return el;
  }

  // The end spacer needs more than just `inset` — mirroring the left side
  // isn't enough. Once the last card is aligned flush-left, everything to
  // its right in the viewport is empty by definition (there's nothing left
  // to show), and that leftover width still has to be physically scrollable
  // into view for the browser to let scrollLeft reach that position at all.
  // Required width, derived from maxScroll >= targetLeft(last):
  //   viewport width − inset − card width − one gap
  // (confirmed by measurement: using plain `inset` here left the last card
  // ~395px short, clamped at the browser's real scroll ceiling.)
  function padTrack() {
    var inset = contentInset();
    track.style.paddingLeft = inset + 'px';
    var lastCard = cards[cards.length - 1];
    var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
    var needed = Math.max(inset, viewport.clientWidth - inset - lastCard.offsetWidth - gap);
    endSpacer().style.width = needed + 'px';
  }

  function targetLeft(i) {
    var card = cards[i];
    return Math.max(0, card.offsetLeft - contentInset());
  }

  function nearestCard() {
    var edge = viewport.scrollLeft + contentInset();
    var best = 0, bestDist = Infinity;
    cards.forEach(function(c, i) {
      var d = Math.abs(c.offsetLeft - edge);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function updateArrows() {
    if (prevBtn) prevBtn.disabled = current <= 0;
    if (nextBtn) nextBtn.disabled = current >= n - 1;
  }

  function updateDots() {
    dots.forEach(function(d, k) { d.classList.toggle('active', k === current); });
  }

  // Runs once organic scrolling (trackpad/wheel) has settled, debounced
  // below. Marks the nearest card active and snaps the viewport the rest of
  // the way to that card's aligned position — free-scrolling can stop
  // anywhere mid-card, so this is what makes it land flush instead of
  // resting wherever momentum happened to run out.
  function syncActive() {
    var active = nearestCard();
    current = active;
    cards.forEach(function(c, k) { c.classList.toggle('active', k === active); });
    updateArrows();
    updateDots();
    animateScrollTo(targetLeft(active));
  }

  // Self-driven, not the browser's native scrollTo(..., {behavior:'smooth'})
  // — confirmed by measurement that retargeting a second click into an
  // in-flight native smooth scroll doesn't reliably land pixel-exact (it
  // settled ~200px short of the true aligned position while still marking
  // the right card active, and didn't fire a clean final 'scroll' event
  // either, so a debounced correction never got a chance to run). Driving
  // the tween by hand means a new click always continues smoothly from
  // wherever the animation currently is, toward the new target, with no
  // dependence on browser-internal interruption behaviour — the last frame
  // always lands exactly on target because that's just the loop's exit case.
  var scrollAnimFrame = null;
  function animateScrollTo(target) {
    if (scrollAnimFrame) cancelAnimationFrame(scrollAnimFrame);
    var start = viewport.scrollLeft;
    var distance = target - start;
    var duration = 450, startTime = null;
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      if (startTime === null) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      viewport.scrollLeft = start + distance * easeOut(p);
      if (p < 1) {
        scrollAnimFrame = requestAnimationFrame(step);
      } else {
        scrollAnimFrame = null;
      }
    }
    scrollAnimFrame = requestAnimationFrame(step);
  }

  function scrollToCard(k) {
    k = Math.max(0, Math.min(n - 1, k));
    current = k;
    cards.forEach(function(c, i) { c.classList.toggle('active', i === k); });
    updateArrows();
    updateDots();
    animateScrollTo(targetLeft(k));
  }

  if (prevBtn) prevBtn.addEventListener('click', function(e) { e.stopPropagation(); scrollToCard(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function(e) { e.stopPropagation(); scrollToCard(current + 1); });

  var scrollT;
  viewport.addEventListener('scroll', function() {
    clearTimeout(scrollT);
    scrollT = setTimeout(syncActive, 80);
  }, { passive: true });

  viewport.addEventListener('wheel', function(e) {
    var horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
    if (horizontal) return; // native horizontal scroll handles it
    // vertical-dominant: hand it to the real scroller so this section never
    // eats a normal scroll gesture, even in browsers that would redirect it
    e.preventDefault();
    if (content) content.scrollTop += e.deltaY;
    else window.scrollBy(0, e.deltaY);
  });

  _stackResize[key] = function() {
    if (!section.isConnected) return;
    sizeCards();
    padTrack();
    viewport.scrollLeft = targetLeft(current < 0 ? 0 : current);
  };
  window.addEventListener('resize', _stackResize[key]);

  sizeCards();
  padTrack();
  // No smooth-scroll on the very first positioning — nothing has scrolled
  // yet, so animating "to" 0 is a no-op anyway; snap straight there.
  viewport.scrollLeft = targetLeft(0);
  current = 0;
  cards[0].classList.add('active');
  updateArrows();
  updateDots();
}

// ── Scroll reveal ──
// threshold 0.08 used to fire the moment an element barely grazed the
// viewport edge — on tall elements that's well before it's actually visible,
// so the fade/slide-up was already finished by the time it scrolled into
// view. rootMargin shrinks the trigger zone in from the bottom so it only
// fires once the element has genuinely scrolled into view.
var REVEAL_ROOT_MARGIN = '0px 0px -15% 0px';

function initReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: REVEAL_ROOT_MARGIN });

  // A single fade+slide-up on a whole block only reads well if the block is
  // roughly viewport-sized: on something much taller (a big case-study
  // section with subheads, images and sliders stacked inside), the required
  // overlap to cross the intersection threshold means scrolling deep into
  // it before it's considered "revealed" — the section sits blank the whole
  // time you'd otherwise be reading its top. Skip those; let them render
  // normally instead of leaving a long empty gap while scrolling toward them.
  var MAX_REVEAL_HEIGHT = window.innerHeight * 1.5;

  // Reveals el as one block if it's short enough; otherwise falls back to
  // revealing its direct children individually, so a section long enough to
  // span several screens still animates in progressively as you scroll
  // through it rather than sitting fully static (the whole-block skip above
  // was fine when only two things on the page were this tall, but the case
  // study section now runs for several screens by itself, which made most
  // of the page's scroll length permanently un-animated).
  function revealBlockOrChildren(el) {
    if (el.offsetHeight <= MAX_REVEAL_HEIGHT) {
      el.classList.add('reveal');
      observer.observe(el);
      return;
    }
    Array.from(el.children).forEach(function(child) {
      if (child.offsetHeight > MAX_REVEAL_HEIGHT) return;
      child.classList.add('reveal');
      observer.observe(child);
    });
  }

  document.querySelectorAll(
    '#wrap_project .breakout:not(.gif-grid):not(.process-stack):not(.approach-scroll), ' +
    '#wrap_project .project-section, ' +
    '#wrap_project .results-section, ' +
    '#wrap_project .project-info-grid, ' +
    '#wrap_project .parallax-section, ' +
    '#wrap_project .kuva-flows-phone'
  ).forEach(revealBlockOrChildren);

  var grid = document.querySelector('.gif-grid');
  if (!grid) return;
  var cells = grid.querySelectorAll('.gif-cell');
  cells.forEach(function(cell) { cell.classList.add('reveal'); });
  var gridObserver = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      var rect = grid.getBoundingClientRect();
      var base = rect.top < window.innerHeight * 0.5 ? 1000 : 0;
      cells.forEach(function(cell, i) {
        setTimeout(function() { cell.classList.add('revealed'); }, base + i * 150);
      });
      gridObserver.disconnect();
    }
  }, { threshold: 0.08, rootMargin: REVEAL_ROOT_MARGIN });
  gridObserver.observe(grid);
}

// ── Staggered rows ──
// Rows of several images/cards side by side (thumbnails, phone screens, the
// two-up code and design-system shots) come in one by one, left to right,
// instead of the whole row fading in as a block. initReveal has already
// tagged the row itself; take that off and reveal its items instead.
var STAGGER_ROWS = '.tool-grid, .phones-row, .design-grid, .code-grid, .store-grid, .kuva-flows-list';
var STAGGER_STEP = 140;   // ms between items

// A row that's already on screen when the project opens (the thumbnails)
// would otherwise stagger in while #wrap_project itself is still invisible,
// waiting on its own .project-alt entrance — so it looked like it just
// appeared. Hold those until the page is actually showing.
function whenProjectShown(cb) {
  var wrap = document.getElementById('wrap_project');
  if (!wrap || wrap.classList.contains('project-alt')) { cb(); return; }
  var mo = new MutationObserver(function() {
    if (!wrap.classList.contains('project-alt')) return;
    mo.disconnect();
    setTimeout(cb, 300);   // let the page's own fade-in get going first
  });
  mo.observe(wrap, { attributes: true, attributeFilter: ['class'] });
}

function initStaggerRows() {
  var rows = document.querySelectorAll('#content ' + STAGGER_ROWS.split(', ').join(', #content '));
  if (!rows.length || !('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      var items = Array.from(entry.target.children);
      whenProjectShown(function() {
        items.forEach(function(item, i) {
          item.style.transitionDelay = (i * STAGGER_STEP) + 'ms';
          item.classList.add('revealed');
        });
        // drop the delays once it's in, so hovers etc. aren't held back later
        setTimeout(function() {
          items.forEach(function(item) { item.style.transitionDelay = ''; });
        }, items.length * STAGGER_STEP + 900);
      });
    });
  }, { threshold: 0.08, rootMargin: REVEAL_ROOT_MARGIN });

  rows.forEach(function(row) {
    if (row.dataset.stagger) return;
    row.dataset.stagger = '1';
    row.classList.remove('reveal', 'revealed');
    Array.from(row.children).forEach(function(item) {
      // Snap straight to the hidden state: an item that's already visible
      // (the thumbnails, on screen from the start) would otherwise *fade out*
      // over .reveal's 0.8s transition, get .revealed 30ms later, and never
      // visibly move at all.
      item.style.transition = 'none';
      item.classList.add('reveal');
      void item.offsetWidth;
      item.style.transition = '';
    });
    observer.observe(row);
  });
}

// ── Inline image lightbox ──
// Overlay lives on <body> (not #content) so it survives project close/reopen
// without needing to be recreated on every load; built lazily on first use.
// Content is rebuilt fresh on every open (rather than reusing a persistent
// <img>) so the compare mode can drop in a live twentytwenty instance.
function ensureLightboxOverlay() {
  var overlay = document.getElementById('img-lightbox');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'img-lightbox';
  overlay.className = 'img-lightbox';
  document.body.appendChild(overlay);
  // Clicking the backdrop closes it. In single-image mode the image itself
  // is also a valid close target (see openLightbox); in compare mode the
  // slider stops its own clicks from reaching here so dragging doesn't
  // close it — see openCompareLightbox.
  overlay.addEventListener('click', function(e) {
    e.stopPropagation();
    closeLightbox();
  });
  return overlay;
}

function showLightboxOverlay(overlay) {
  overlay.style.display = 'flex';
  // force a reflow so the opacity transition actually runs instead of
  // jumping straight to 1 right after display was just set to flex
  overlay.offsetHeight;
  overlay.classList.add('active');
}

function openLightbox(src, alt) {
  var overlay = ensureLightboxOverlay();
  overlay.innerHTML = '';
  overlay.classList.remove('img-lightbox-compare-mode');
  var img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  overlay.appendChild(img);
  showLightboxOverlay(overlay);
}

// Same overlay, but for the inline "GIF" videos (.project-video: autoplay,
// loop, muted, no controls — see .project-video-wrap). Bigger copy, same
// playback style, no controls here either so it stays consistent with the
// inline one.
function openVideoLightbox(src) {
  var overlay = ensureLightboxOverlay();
  overlay.innerHTML = '';
  overlay.classList.remove('img-lightbox-compare-mode');
  var video = document.createElement('video');
  video.src = src;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  overlay.appendChild(video);
  showLightboxOverlay(overlay);
}

// Full scene, not just the front layer: clones the section's bg + top/fan
// together so the lightbox shows the same composition as the page, just
// frozen — the scroll-driven transform each layer picks up from parallaxLoop
// is stripped so nothing drifts while it's open.
function openParallaxLightbox(section) {
  var overlay = ensureLightboxOverlay();
  overlay.innerHTML = '';
  overlay.classList.remove('img-lightbox-compare-mode');
  var clone = section.cloneNode(true);
  clone.className = 'img-lightbox-parallax';
  clone.style.cursor = '';   // drop the original's zoom-in cursor — this is the close target now, so it takes .img-lightbox's zoom-out instead
  var btn = clone.querySelector('.compare-expand-btn');
  if (btn) btn.remove();
  clone.querySelectorAll('.parallax-bg, .parallax-top').forEach(function(el) {
    el.style.transform = '';
  });
  overlay.appendChild(clone);
  showLightboxOverlay(overlay);
}

// Same lightbox, but drops in a live twentytwenty slider instead of a
// static image — reuses .compare-item's existing styling (rounded corners,
// arrow colors) since it's just that same markup pattern, full-screen.
function openCompareLightbox(images, alt) {
  var overlay = ensureLightboxOverlay();
  overlay.innerHTML = '';
  overlay.classList.add('img-lightbox-compare-mode');

  var wrap = document.createElement('div');
  wrap.className = 'compare-item img-lightbox-compare';
  var container = document.createElement('div');
  container.className = 'twentytwenty-container';
  images.forEach(function(src) {
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    container.appendChild(img);
  });
  wrap.appendChild(container);
  // Only the handle needs to stop its click from bubbling (that's the drag
  // target — closing on every drag would defeat the point). Clicking the
  // image elsewhere is free to bubble up to the overlay's close-on-click
  // handler, same as the single-image lightbox's click-to-close.
  wrap.addEventListener('click', function(e) {
    if (e.target.closest('.twentytwenty-handle')) e.stopPropagation();
  });
  overlay.appendChild(wrap);

  showLightboxOverlay(overlay);
  $(container).twentytwenty({ default_offset_pct: 0.2 });
}

function closeLightbox() {
  var overlay = document.getElementById('img-lightbox');
  if (!overlay || !overlay.classList.contains('active')) return;
  overlay.classList.remove('active');
  // Belt-and-braces on top of pointer-events:none: fully take the full-
  // viewport overlay out of layout once the fade-out finishes, so there's
  // no way a stationary cursor can end up stuck over a dead hit-test area.
  // Clearing the content here (not on open) also tears down the compare
  // mode's live twentytwenty instance and its window resize listener.
  setTimeout(function() {
    if (overlay.classList.contains('active')) return;
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }, 260);
}

// ── Expand button, shared by compare sliders and standalone research images ──
// twentytwenty's own click/drag handling on the container makes a plain
// click-to-zoom (like .project-hero-img alone gets) unreliable there, so
// every lightbox-enabled image gets this same visible button instead.
function createExpandBtn(onClick) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'compare-expand-btn';
  btn.setAttribute('aria-label', 'Expand image');
  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none">' +
      '<path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

// Shared by the expand button and the direct-click-on-slider handler below.
function openCompareLightboxFromContainer(container) {
  var imgs = Array.from(container.querySelectorAll('img'));
  if (!imgs.length) return;
  var alt = (imgs.find(function(i) { return /after/i.test(i.alt); }) || imgs[0]).alt.replace(/\s*—\s*(before|after)$/i, '');
  openCompareLightbox(imgs.map(function(i) { return i.src; }), alt);
}

function initCompareExpand() {
  // Compare sliders: the button opens the same drag comparison, full-screen
  // — injected as a sibling of .twentytwenty-container (not inside it),
  // since that container needs overflow:hidden for its rounded corners.
  document.querySelectorAll('.compare-item').forEach(function(item) {
    if (item.querySelector('.compare-expand-btn')) return;
    var container = item.querySelector('.twentytwenty-container');
    if (!container) return;
    item.appendChild(createExpandBtn(function() {
      openCompareLightboxFromContainer(container);
    }));
  });

  // Standalone research images (service blueprint, pain points, …) get the
  // same icon, wrapped so it can be positioned against them the same way.
  document.querySelectorAll('.project-hero-img:not(.no-expand)').forEach(function(img) {
    if (img.closest('.img-expand-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'img-expand-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    wrap.appendChild(createExpandBtn(function() {
      openLightbox(img.src, img.alt);
    }));
  });

  // Inline "GIF" videos get the same icon and wrapper as standalone
  // images, but the whole video is a click target too (it has no controls,
  // so a plain click does nothing on its own — safe to repurpose, same as
  // .parallax-section below).
  document.querySelectorAll('.project-video:not(.no-expand)').forEach(function(video) {
    if (video.closest('.img-expand-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'img-expand-wrap';
    video.parentNode.insertBefore(wrap, video);
    wrap.appendChild(video);
    var openThisVideo = function() {
      var source = video.currentSrc || (video.querySelector('source') || {}).src;
      if (source) openVideoLightbox(source);
    };
    video.style.cursor = 'zoom-in';
    video.addEventListener('click', openThisVideo);
    wrap.appendChild(createExpandBtn(openThisVideo));
  });

  // Parallax sections (bg + top image, or bg + phones-fan) — already
  // position:relative/overflow:hidden, so the button drops straight in
  // without a wrapper. The whole section is clickable too (button's own
  // stopPropagation keeps this from double-firing), not just the icon.
  document.querySelectorAll('.parallax-section:not(.compare-item)').forEach(function(section) {
    if (section.querySelector('.compare-expand-btn')) return;
    section.style.cursor = 'zoom-in';
    section.addEventListener('click', function(e) {
      e.stopPropagation();   // #content click also closes the project — don't let this bubble into that
      openParallaxLightbox(section);
    });
    section.appendChild(createExpandBtn(function() {
      openParallaxLightbox(section);
    }));
  });
}

// ── In-page anchor links (#section) inside a project ──
// Plain #hash navigation jumps instantly (scroll-behavior on #content wasn't
// reliably applied), tacks the hash onto the /project.html URL, and the
// click bubbled on into #content's close-on-click. Scroll smoothly instead,
// honouring scroll-margin-top and reduced motion, and keep the URL as is.
function initInPageAnchors() {
  var content = document.getElementById('content');
  if (!content) return;
  content.querySelectorAll('a[href^="#"]').forEach(function(a) {
    var id = a.getAttribute('href').slice(1);
    if (!id || a.dataset.anchorBound) return;
    a.dataset.anchorBound = '1';
    a.addEventListener('click', function(e) {
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  });
}

// ── About page: profile photo that "moves its head" on hover ──
// The photo is a double-exposure of a head mid-turn. On hover it drifts
// toward the cursor, and a blurred copy (screen-blended, like the photo's
// own second exposure) trails behind it in proportion to mouse speed, so a
// quick flick reads as motion blur and it all settles back when you stop.
// Skipped for reduced motion and on touch (no hover to drive it).
// ── GIF-style videos ── autoplay can be held back (Safari Low Power Mode,
// or a video that wasn't ready when the fragment was injected), leaving a
// frozen first frame. Nudge each one to play once it can.
function initGifVideos() {
  document.querySelectorAll('#content video.project-video').forEach(function(v) {
    v.muted = true;   // required for autoplay; set the property, not just the attribute
    var p = v.play();
    if (p && p.catch) p.catch(function() {});
  });
}

function initProfileMotion() {
  var img = document.getElementById('profilePhoto');
  var frame = document.getElementById('profilePhotoFrame');
  if (!img || !frame || frame.dataset.bound) return;
  frame.dataset.bound = '1';
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

  var ghost = img.cloneNode(false);
  ghost.removeAttribute('id');
  ghost.className = 'profile-ghost';
  ghost.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  frame.appendChild(ghost);

  var x = 0, y = 0, tx = 0, ty = 0;   // drift toward the cursor, px
  // A fixed 2% overscan (applied up front, not on hover, so nothing visibly
  // zooms) gives the drift room to move without the frame's edges showing.
  var s = 1.02, ts = 1.02;
  img.style.transform = ghost.style.transform = 'scale(1.02)';
  var vx = 0, vy = 0;                 // smoothed mouse velocity, px per frame
  var lastX = null, lastY = null, lastT = 0;
  var raf = null;

  function tick() {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    s += (ts - s) * 0.1;
    vx *= 0.88;
    vy *= 0.88;
    var speed = Math.min(Math.sqrt(vx * vx + vy * vy), 25) / 25;   // 0..1

    img.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    img.style.filter = speed > 0.02 ? 'blur(' + (speed * 1.5).toFixed(2) + 'px)' : '';
    ghost.style.transform = 'translate3d(' + (x - vx * 1.6).toFixed(2) + 'px,' + (y - vy * 1.6).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    ghost.style.opacity = (speed * 0.45).toFixed(3);
    ghost.style.filter = 'blur(' + (speed * 6).toFixed(2) + 'px)';

    var settled = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 &&
                  Math.abs(ts - s) < 0.0005 && speed < 0.005;
    if (settled) {
      img.style.filter = '';
      ghost.style.opacity = '0';
      raf = null;
    } else {
      raf = requestAnimationFrame(tick);
    }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  frame.addEventListener('mouseenter', function(e) {
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    kick();
  });

  frame.addEventListener('mousemove', function(e) {
    var r = frame.getBoundingClientRect();
    // drift stays inside the 1% overscan on each side at any frame size
    tx = ((e.clientX - r.left) / r.width - 0.5) * r.width * 0.018;
    ty = ((e.clientY - r.top) / r.height - 0.5) * r.height * 0.018;
    var now = performance.now();
    if (lastX !== null) {
      var dt = Math.max(now - lastT, 1);
      // scale to px per ~16ms frame, blended so one jittery event can't spike it
      vx = vx * 0.5 + ((e.clientX - lastX) / dt * 16) * 0.5;
      vy = vy * 0.5 + ((e.clientY - lastY) / dt * 16) * 0.5;
      // cap it: a hard flick should smear the head, not slide a second
      // copy of the whole photo 200px across (trail tops out ~40px)
      vx = Math.max(-25, Math.min(25, vx));
      vy = Math.max(-25, Math.min(25, vy));
    }
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    kick();
  });

  frame.addEventListener('mouseleave', function() {
    tx = 0; ty = 0;
    lastX = null;
    kick();
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var overlay = document.getElementById('img-lightbox');
  if (overlay && overlay.classList.contains('active')) {
    closeLightbox();
    // stop the page's own Escape-closes-project listener from also firing
    e.stopImmediatePropagation();
  }
});

// ── Counter animation ──
function initCounters() {
  function animateCounter(el) {
    var text = el.textContent.trim();
    // Capture any non-numeric prefix (#, +) and suffix (K, k, M, %, +, M+ …).
    var m = text.match(/^([^\d.]*)([\d.,]+)(.*)$/);
    if (!m) return;
    var prefix = m[1];
    var numStr = m[2].replace(/,/g, '');
    var suffix = m[3];
    var target = parseFloat(numStr);
    if (isNaN(target)) return;
    var decimals = numStr.indexOf('.') >= 0 ? numStr.split('.')[1].length : 0;
    // keep thousands separators when the original had them (3,000+)
    var grouped = m[2].indexOf(',') >= 0;
    function fmt(n) {
      return grouped ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                     : n.toFixed(decimals);
    }
    var duration = 1400, startTime = null;
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      if (!startTime) startTime = now;
      var p = Math.min((now - startTime) / duration, 1);
      el.textContent = prefix + fmt(target * easeOut(p)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = prefix + fmt(0) + suffix;
    requestAnimationFrame(step);
  }
  var grids = document.querySelectorAll('.stats-grid');
  if (!grids.length) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.stat-value').forEach(animateCounter);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  grids.forEach(function(grid) { observer.observe(grid); });
}

// ── Tile hero (AI page) ──
// An isometric grid of cubes (Three.js, loaded on demand from cdnjs only when
// the hero is on the page). Flat at rest; a pond ripple eases out from a random
// spot every ~10s and runs out until the grid is perfectly flat again, and the
// cursor raises a smooth hill that glides after it. A lifted cube's sides show a
// liquid gradient that's shared across the whole grid, so neighbours match;
// every edge carries one hairline. Follows the theme (eased), idles off-screen
// or while a project covers the landing, and holds a flat frame for reduced motion.
var THREE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
var _threeWaiting = null;
function loadThree(cb) {
  if (window.THREE) return cb();
  if (_threeWaiting) return _threeWaiting.push(cb);
  _threeWaiting = [cb];
  var s = document.createElement('script');
  s.src = THREE_SRC;
  s.onload = function() { var q = _threeWaiting; _threeWaiting = null; q.forEach(function(f) { f(); }); };
  s.onerror = function() { _threeWaiting = null; };
  document.head.appendChild(s);
}

function initTilesHero() {
  var canvas = document.querySelector('#landing .tiles-canvas, #content .tiles-canvas');
  if (!canvas || canvas.dataset.ready) return;
  canvas.dataset.ready = '1';
  var probe = document.createElement('canvas');
  if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;  // plain page background instead
  loadThree(function() { if (document.contains(canvas)) runTilesHero(canvas); });
}

function runTilesHero(canvas) {
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var scene = new THREE.Scene();

  // tile: a plain box, top face at y = 0 when resting; no gap, so neighbouring
  // edges meet in a single hairline
  var SIZE = 1, H = 1.5;
  var geo = new THREE.BoxGeometry(SIZE, H, SIZE);
  geo.translate(0, -H / 2, 0);

  var mat = new THREE.ShaderMaterial({
    uniforms: { uDark: { value: 0 }, uTime: { value: 0 }, uHalf: { value: new THREE.Vector3(SIZE / 2, H / 2, SIZE / 2) } },
    extensions: { derivatives: true },
    vertexShader: [
      'attribute float aLift;',
      'varying vec3 vN; varying vec3 vW; varying float vLift; varying float vLocalY; varying vec3 vP;',
      'void main(){',
      '  vP = position;',
      '  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);',
      '  vN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);',
      '  vW = w.xyz; vLift = aLift; vLocalY = position.y;',
      '  gl_Position = projectionMatrix * viewMatrix * w;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uDark; uniform float uTime; uniform vec3 uHalf;',
      'varying vec3 vN; varying vec3 vW; varying float vLift; varying float vLocalY; varying vec3 vP;',
      /* violet → ultramarine → cyan → hot pink → orange → back to violet */
      'vec3 pal(float t){',
      '  vec3 c0 = vec3(0.47,0.20,1.00);',   /* electric violet */
      '  vec3 c1 = vec3(0.10,0.30,1.00);',   /* ultramarine */
      '  vec3 c2 = vec3(0.00,0.78,1.00);',   /* cyan */
      '  vec3 c3 = vec3(1.00,0.20,0.62);',   /* hot pink */
      '  vec3 c4 = vec3(1.00,0.42,0.08);',   /* orange */
      '  t = fract(t) * 5.0; float f = smoothstep(0.0, 1.0, fract(t));',
      '  if (t < 1.0) return mix(c0, c1, f);',
      '  if (t < 2.0) return mix(c1, c2, f);',
      '  if (t < 3.0) return mix(c2, c3, f);',
      '  if (t < 4.0) return mix(c3, c4, f);',
      '  return mix(c4, c0, f);',
      '}',
      'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
      'float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
      '  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }',
      'void main(){',
      '  vec3 N = normalize(vN);',
      '  vec3 L = normalize(vec3(-0.45, 1.0, 0.35));',
      '  float diff = clamp(dot(N, L), 0.0, 1.0);',
      '  float seed = vW.x * 0.045 - vW.z * 0.03;',
      /* top: soft, slightly tinted, lit like felt */
      '  vec3 topL = mix(vec3(0.985,0.982,0.995), pal(seed + uTime*0.02), 0.06);',
      '  vec3 topD = mix(vec3(0.11,0.11,0.13), pal(seed + uTime*0.02), 0.08);',
      '  vec3 top = mix(topL, topD, uDark);',
      '  vec3 col;',
      '  if (N.y > 0.5) {',
      '    col = top;',
      '    col = mix(col, pal(seed + uTime*0.03), vLift * 0.12);',
      '  } else {',
      /* sides: one shared gradient field across the grid (so neighbours stay
         coordinated) with a slow liquid flow running through it */
      '    float depth = -vLocalY;',
      '    float field = (vW.x - vW.z) * 0.035 + noise(vW.xz * 0.12 + uTime * 0.05) * 0.18;',
      '    vec2 q = vec2(vW.x + vW.z, depth * 2.4);',
      '    float flow = noise(q * 0.9 + vec2(uTime * 0.25, -uTime * 0.4)) * 0.7',
      '               + noise(q * 2.2 - vec2(uTime * 0.2, uTime * 0.15)) * 0.3;',
      '    vec3 g = pal(field + depth * 0.45 + flow * 0.55 + uTime * 0.025);',
      '    float side = abs(N.x) > 0.5 ? 0.9 : 1.0;',
      '    vec3 lit = g * side;',
      '    vec3 rest = top * mix(0.82, 1.7, uDark);',
      '    float show = smoothstep(0.02, 0.25, vLift) * (1.0 - smoothstep(0.0, 0.9, depth - vLift * 1.2));',
      '    col = mix(rest, lit, clamp(show, 0.0, 1.0));',
      '    col = mix(col, top, (1.0 - smoothstep(0.0, 0.06, depth)) * 0.6);',
      '  }',
      /* hairline on every cube edge: distance to the nearest edge of this face */
      '  vec3 e = uHalf - abs(vP - vec3(0.0, -uHalf.y, 0.0));',
      '  float m1 = min(e.x, min(e.y, e.z));',
      '  float m2 = e.x + e.y + e.z - m1 - max(e.x, max(e.y, e.z));',
      '  float px = fwidth(m2);',
      '  float edge = 1.0 - smoothstep(px * 0.35, px * 1.05, m2);',
      '  vec3 stroke = N.y > 0.5 ? mix(vec3(0.76), vec3(0.34), uDark) : mix(col, vec3(1.0), 0.65);',
      '  col = mix(col, stroke, edge * mix(0.9, 1.0, vLift));',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });

  // grid: big enough to fill the frame in isometric view
  var COLS = 30, ROWS = 30, N = COLS * ROWS;
  var mesh = new THREE.InstancedMesh(geo, mat, N);
  var lift = new Float32Array(N), liftAttr = new THREE.InstancedBufferAttribute(lift, 1);
  geo.setAttribute('aLift', liftAttr);
  scene.add(mesh);
  var cur = new Float32Array(N), vel = new Float32Array(N);
  var ox = -COLS / 2 + 0.5, oz = -ROWS / 2 + 0.5;

  // isometric camera (orthographic, 45° around, ~35° down)
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  function resize() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var tilePx = w < 760 ? 84 : 120;         // roughly how wide one tile reads on screen
    var half = w / tilePx / 2 * 1.2;
    camera.left = -half; camera.right = half;
    camera.top = half * h / w; camera.bottom = -half * h / w;
    camera.position.set(10, 8.165, 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // hover: the point on the grid under the cursor
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var hit = new THREE.Vector3(), hover = null;
  if (!reduced && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    var onMove = function(e) {
      if (!document.contains(canvas)) { window.removeEventListener('pointermove', onMove); return; }
      var r = canvas.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) { hover = null; return; }
      ndc.set(x * 2 - 1, -(y * 2 - 1));
      ray.setFromCamera(ndc, camera);
      hover = ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', function() { hover = null; });
  }

  var m4 = new THREE.Matrix4(), t0 = performance.now();
  var dark = document.documentElement.classList.contains('dark') ? 1 : 0;
  var sh = { x: 0, z: 0 }, hs = 0;   // smoothed hover point and hill strength
  // pond ripple: one at a time; the next waits until this one has run out
  var drops = [], nextDrop = 0.6, LIFE = 8, PAUSE = 1.2;
  function smooth(a, b, v) { v = Math.max(0, Math.min(1, (v - a) / (b - a))); return v * v * (3 - 2 * v); }
  function ripple(x, z, t) {
    var h = 0;
    for (var i = 0; i < drops.length; i++) {
      var dr = drops[i], age = t - dr.t;
      if (age < 0) continue;
      var d = Math.hypot(x - dr.x, z - dr.z) - age * 1.8;   // ring spreads 1.8 tiles/s
      // eases in, then fades all the way to zero by the end of its life
      var env = smooth(0, 0.8, age) * (1 - smooth(LIFE * 0.35, LIFE, age));
      h += 0.3 * env * Math.exp(-(d * d) / (2 * 0.8 * 0.8));
    }
    return h;
  }

  function step(t) {
    dark += ((document.documentElement.classList.contains('dark') ? 1 : 0) - dark) * 0.08;
    mat.uniforms.uDark.value = dark;
    mat.uniforms.uTime.value = t;
    if (hover) {
      if (hs < 0.01) { sh.x = hover.x; sh.z = hover.z; }
      sh.x += (hover.x - sh.x) * 0.12; sh.z += (hover.z - sh.z) * 0.12;
    }
    hs += ((hover ? 1 : 0) - hs) * 0.06;
    if (t > nextDrop) {
      drops.push({ x: -8 + Math.random() * 8, z: -8 + Math.random() * 8, t: t });
      nextDrop = t + LIFE + PAUSE + Math.random();
    }
    drops = drops.filter(function(dr) { return t - dr.t < LIFE; });

    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var k = r * COLS + c, x = ox + c, z = oz + r;
      var target = ripple(x, z, t);
      if (hs > 0.001) {
        var dx = x - sh.x, dz = z - sh.z;
        target += hs * 1.3 * Math.exp(-(dx * dx + dz * dz) / (2 * 0.8 * 0.8));
      }
      // spring: cubes rise with a soft bounce, then settle exactly flat
      vel[k] += (target - cur[k]) * 0.1;
      vel[k] *= 0.76;
      cur[k] += vel[k];
      if (target === 0 && Math.abs(cur[k]) < 0.002 && Math.abs(vel[k]) < 0.002) { cur[k] = 0; vel[k] = 0; }
      lift[k] = Math.max(0, Math.min(1, cur[k] / 1.1));
      m4.makeTranslation(x, Math.max(-0.2, cur[k]), z);
      mesh.setMatrixAt(k, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
    liftAttr.needsUpdate = true;
    renderer.render(scene, camera);
  }

  // reduced motion: one flat, held frame (redrawn on resize / theme change)
  if (reduced) {
    var still = function() { dark = document.documentElement.classList.contains('dark') ? 1 : 0; step(0); };
    still();
    window.addEventListener('resize', still);
    new MutationObserver(still).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return;
  }

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(e) { visible = e[0].isIntersecting; }).observe(canvas);
  }
  // parallax: the canvas drifts down at about half the scroll speed, inside
  // the hero's overflow:hidden, so the page slides up over it
  var hero = canvas.parentNode, shift = null;
  (function loop(now) {
    if (!document.contains(canvas)) { window.removeEventListener('resize', resize); renderer.dispose(); return; }
    // on a landing page with a project open over it: nothing to see, so idle
    if (visible && !(_landingCovered && canvas.closest('#landing'))) {
      var y = Math.round(Math.max(0, -hero.getBoundingClientRect().top) * 0.5);
      if (y !== shift) { shift = y; canvas.style.transform = 'translate3d(0,' + y + 'px,0)'; }
      step((now - t0) / 1000);
    }
    requestAnimationFrame(loop);
  })(t0);
}

// ── Video autoplay on scroll ──
function initVideoObserver() {
  var video = document.querySelector('video.project-video');
  if (!video) return;
  video.muted = true;
  var vo = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { video.play(); } else { video.pause(); }
    });
  }, { threshold: 0.3 });
  vo.observe(video);
}

jQuery(document).ready(function() {
  var scrollTop = window.innerHeight;
  var background = $(".bg-video");
  var center = $("#center");
  var menu = $("#menu");
  var topbar = $("#topbar");
  var title = $("h1");
  var toggleM = $("#nav-toggle");

  var previousScroll = 0;

  //alert(scrollTop);
  var SCROLL_THRESHOLD = 0;

  var hasScroll = false;
  var menuHidden = false;

  $("#m-bg").height(0);

  var introEl = document.getElementById("intro");
  var rafPending = false;

  window.addEventListener("scroll", function(e) {
    previousScroll = window.scrollY;

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(function() {
        var sy = window.scrollY;
        var t = "translate3d(0px," + sy * -0.2 + "px,0px)";
        if (introEl) { introEl.style.webkitTransform = t; introEl.style.transform = t; }

        if (sy > 420) {
          if (!hasScroll) {
            hasScroll = true;
            menu.addClass("menu-fix");
            topbar.show();
            toggleM.addClass("toggleS");
          }
        } else {
          if (hasScroll) {
            hasScroll = false;
            menu.removeClass("menu-fix");
            topbar.hide();
            toggleM.removeClass("toggleS");
          }
        }
        rafPending = false;
      });
    }
  }, { passive: true });
  //-------------- scroll -------------------------------

  //-------------- menu -------------------------------
  
    setActiveNav(null);   // home until a landing page says otherwise
    // Deep link: /atlas.html opens that project over the grid.
    if (!isRootPath()) {
    	var url = window.location.pathname.substr(1, window.location.pathname.length);
    	if (url.slice(-5) === '.html') url = url.slice(0, -5);
    	if (LANDINGS[url]) folio(url, 'content', false);   // a page: straight away
    	else setTimeout(function() {
	    	folio(url, 'content', false);
    	}, 500);
    }
    
    window.onpopstate = function (event) {
	    var isRoot = isRootPath();
	    if (isRoot) {
		    if (document.getElementById('remove')) close(false);
		    hideLanding();
	    } else if (!isRoot && event.state.url) {
		    folio(event.state.url, 'content', false);
	    }
	    
	    if (event.state && event.state.title) {
		    document.title = event.state.title;
	    }
    }
});

function isRootPath() {
	var path = window.location.pathname;
    return path === '/' || path === ''; 
}

function menu() {
  if ($("#m-bg").is(":visible")) {
    isMenuOpen = false;
    /* enableScroll(); */
    $("#m-bg").animate({ height: 0 }, function() {
      $(this).hide();
    });
  } else {
    isMenuOpen = true;
    /* disableScroll(); */
    $("#m-bg")
      .show()
      .animate({
        height: "100%"
      });
    folio("about", "content");
  }
  //console.log("isMenuOpen", isMenuOpen);
}

function disableScroll() {
  window.onmousewheel = document.onmousewheel = function(e) {
    e = e || window.event;
    if (e.preventDefault) e.preventDefault();
    e.returnValue = false;
  };
}

function enableScroll() {
  window.onmousewheel = document.onmousewheel = null;
}

function loadFolio(url, target) {
  setTimeout(function() {
    var open = document.getElementById('remove');
    if (open && !open.dataset.closing) coverLanding(true);
  }, 1000);
  $("body").append('<div id="remove"><div id="content"></div></div>');
  circleReveal();
  $("#overlay").fadeIn("fast", function() {
    // Lock <html>, not <body> — the page scrollbar lives there now, so
    // locking body left html still scrollable and #content added a second
    // scrollbar of its own. scrollbar-gutter:stable holds the gutter open,
    // so hiding it here doesn't shift the layout underneath.
    $("html").css("overflow", "hidden");
    $("#content").fadeIn("slow", function() {
      requestFolio(url, target);
    });
  });
}

// A page opened from inside another one (or back/forward between two pages)
// replaces the open page rather than stacking a second overlay on top: the
// overlay stays, the old #remove goes, and a fresh one fades in when loaded.
function swapFolio(url, target) {
  _clickPoint = null;
  $("#content").stop(true).fadeTo(200, 0, function() {
    $("#remove").remove();
    $("body").append('<div id="remove"><div id="content" style="display:block;opacity:0"></div></div>');
    requestFolio(url, target);
  });
}

function requestFolio(url, target) {
  //document.getElementById(target).innerHTML = 'sending...';
  if (window.XMLHttpRequest) {
    req = new XMLHttpRequest();
    req.onreadystatechange = function() {
      folioDone(target);
    };
    req.open("GET", url, true);
    req.send(null);
    // IE/Windows ActiveX version
  } else if (window.ActiveXObject) {
    req = new ActiveXObject("Microsoft.XMLHTTP");
    if (req) {
      req.onreadystatechange = function() {
        folioDone(target);
      };
      req.open("GET", url, true);
      req.send();
    }
  }
}

// LOAD PROJECT
function folio(url, target, push = true) {
  if (url === 'claude_code') url = 'ai';   // split into three pages, all linked from AI
  if (LANDINGS[url]) { showLanding(url, push); return; }
  resetViewportZoom();
  var path = '/projects/' + url + '/' + url + '.html?v=' + Date.now();
  if (document.getElementById('remove')) swapFolio(path, target);
  else loadFolio(path, target);
  var title = 'Angelo Wellens | ' + url;
  document.title = title;
  if (push) {
	  window.history.pushState({ title: title, url: url }, title, '/' + url + '.html');
  }
}

// ── Landing pages ──
// AI and About me are pages, not projects: they replace the homepage under the
// header (their pill shows as selected) instead of opening in the overlay. A
// project opened from one opens on top of it as usual, and closing the project
// steps back to it. Fragments come from the same projects/<name>/<name>.html.
var LANDINGS = { ai: 'ai-link', about: 'about' };
var _landing = null;

function showLanding(url, push) {
  var title = 'Angelo Wellens | ' + url;
  document.title = title;
  if (push) window.history.pushState({ title: title, url: url }, title, '/' + url + '.html');
  var open = document.getElementById('remove');
  if (open && !open.dataset.closing) close(false);   // a project on top: back to the page under it
  if (_landing === url) return;
  _landing = url;
  setActiveNav(url);
  document.body.classList.add('is-landing');
  var box = document.getElementById('landing');
  box.innerHTML = '';
  window.scrollTo(0, 0);
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    if (_landing !== url || xhr.status !== 200) return;
    // the fragment's ids would clash with a project opened on top (folioDone
    // looks them up by id), so the landing copy gets its own
    box.innerHTML = xhr.responseText
      .replace(/wrap_project/g, 'landing_wrap')
      .replace(/<img id="loader2"[^>]*>/, '');
    // and its styles only apply inside #landing, so they can't leak into a
    // project opened on top (About's bare h4{} centred every project title)
    box.querySelectorAll('style').forEach(function(st) {
      st.textContent = scopeCss(st.textContent, '#landing');
    });
    initTilesHero();
    initProfileMotion();
    initProcessStack(box);
    requestAnimationFrame(function() {
      var w = document.getElementById('landing_wrap');
      if (w) w.classList.add('project-alt');
    });
  };
  xhr.open('GET', '/projects/' + url + '/' + url + '.html?v=' + Date.now(), true);
  xhr.send(null);
}

function hideLanding() {
  if (!_landing) return;
  _landing = null;
  setActiveNav(null);
  document.body.classList.remove('is-landing');
  document.getElementById('landing').innerHTML = '';
  _pendingScrambles.splice(0).forEach(function(p) { scrambleText(p[0], p[1]); });
  // the grid was display:none, so masonry has nothing to go on until now
  $('.work-grid').each(function() {
    if ($(this).hasClass('masonry')) $(this).masonry('reload');
  });
}

// url null = the homepage grid, which "Product work" stands for
function setActiveNav(url) {
  var qf = document.querySelector('#quick-filter .qf-btn');
  if (qf) qf.classList.toggle('is-active', !url);
  Object.keys(LANDINGS).forEach(function(k) {
    var a = document.querySelector('#' + LANDINGS[k] + ' a');
    if (!a) return;
    a.classList.toggle('is-active', k === url);
    if (k === url) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// Prefix every selector in a stylesheet with `scope` (html/body selectors keep
// their place in front: html.dark .x → html.dark #landing .x). @media and
// @supports are scoped inside; @keyframes / @font-face are left alone.
function scopeCss(css, scope) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  var out = '', i = 0;
  while (i < css.length) {
    var open = css.indexOf('{', i);
    if (open < 0) break;
    var head = css.slice(i, open).trim();
    var depth = 1, j = open + 1;
    while (j < css.length && depth) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    var body = css.slice(open + 1, j - 1);
    if (/^@(media|supports)/.test(head)) out += head + '{' + scopeCss(body, scope) + '}\n';
    else if (head.charAt(0) === '@') out += head + '{' + body + '}\n';
    else out += head.split(',').map(function(sel) {
      sel = sel.trim();
      var m = sel.match(/^((?:html|body)[\w.:#-]*)(?:\s+|$)/);
      if (!m) return scope + ' ' + sel;
      var rest = sel.slice(m[0].length);
      return m[1] + ' ' + scope + (rest ? ' ' + rest : '');
    }).join(', ') + '{' + body + '}\n';
    i = j;
  }
  return out;
}

// While a project covers a landing page, its animation (initTilesHero) idles.
// Flagged only once the overlay has fully revealed (circleReveal runs 0.9s).
// The project's own unscoped styles can still reflow the page underneath, so
// its scroll position is put back on the way out.
var _landingCovered = false, _landingScroll = 0;
function coverLanding(on) {
  on = !!(on && _landing);
  if (on === _landingCovered) return;
  if (on) _landingScroll = window.scrollY;
  _landingCovered = on;
  if (!on) window.scrollTo(0, _landingScroll);
}

// ── Fixed-width project pages ──
// Kuva's collage is pinned to an exact 1400px because its legacy layout places
// every image with percentage negative margins tuned against that width — let
// the container shrink and those margins drift, reopening the gaps between
// sections. The plan was for phones to pan across it like a wide image, but
// pinch-zoom is disabled site-wide (see the viewport meta / resetViewportZoom),
// so there was no way to see it whole and it just read as broken.
//
// Scaling the whole page down uniformly keeps the collage geometrically
// identical — both axes scale together, so nothing can drift — while making it
// fit. `zoom` rather than `transform: scale()` for two reasons: #wrap_project's
// entrance animation sets `transform` with !important via .project-alt and
// would clobber an inline transform, and zoom shrinks the layout box too, so
// there's no leftover empty space below to claw back with negative margins.
// Only the LEGACY blocks get scaled. #wrap_project also holds the modern
// case-study copy (.project-details) and the .kuva-feature panels, which are
// ordinary responsive blocks with their own breakpoints — zooming the whole
// container shrank those to ~4px text while the page title, which lives
// outside #wrap_project, stayed full size. So the container goes fluid and
// each run of legacy siblings is wrapped in its own fixed-width box that is
// scaled down as a unit, preserving the overlaps between them.
// Kuva page: the Kuvacash 2024 flows section. Each button swaps the phone to that flow's
// recording, and each one plays on into the next; the next clip loads in the hidden <video> and fades in once it can play.
// Plays only while the section is on screen, and waits for a tap under reduced motion.
function initKuvaFlows() {
  var root = document.querySelector('.kuva-flows');
  if (!root) return;
  var screen = root.querySelector('.kuva-flows-screen');
  var vids = screen.querySelectorAll('video');
  var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-clip]'));
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var base = 'projects/kuva/assets/flows/', ver = '?v=2';
  var on = vids[0], want = null, visible = false, started = false;

  // a click in #content closes the project; this section is for clicking
  root.addEventListener('click', function(e) { e.stopPropagation(); });

  function play(v) {
    if (still || !visible) return;
    var p = v.play();
    if (p && p.catch) p.catch(function() { screen.classList.add('is-paused'); });
  }

  function show(id) {
    want = id;
    var btn = buttons.filter(function(b) { return b.dataset.clip === id; })[0];
    buttons.forEach(function(b) { b.setAttribute('aria-pressed', String(b === btn)); });
    var next = started ? (on === vids[0] ? vids[1] : vids[0]) : on;
    next.poster = base + id + '.jpg' + ver;
    next.setAttribute('aria-label', 'Recording of the ' + btn.querySelector('b').textContent + ' flow');
    next.removeAttribute('aria-hidden');
    next.addEventListener('loadeddata', function() {
      if (want !== id) return;
      next.classList.add('is-on');
      if (next !== on) {
        on.classList.remove('is-on');
        on.pause();
        on.setAttribute('aria-hidden', 'true');
      }
      on = next;
      play(next);
    }, { once: true });
    next.preload = 'auto';
    next.src = base + id + '.mp4' + ver;
    next.load();
    started = true;
  }

  buttons.forEach(function(b) {
    b.addEventListener('click', function() { if (b.dataset.clip !== want) show(b.dataset.clip); });
  });

  // when a flow finishes, play the next one (back to the first after the last)
  Array.prototype.forEach.call(vids, function(v) {
    v.loop = false;
    v.addEventListener('ended', function() {
      if (v !== on) return;
      var i = buttons.findIndex(function(b) { return b.dataset.clip === want; });
      show(buttons[(i + 1) % buttons.length].dataset.clip);
    });
  });
  root.querySelector('.kuva-flows-play').addEventListener('click', function() {
    screen.classList.remove('is-paused');
    var p = on.play();
    if (p && p.catch) p.catch(function() {});
  });

  // the playing flow's progress line fills as its loop plays
  (function tick() {
    if (!document.body.contains(root)) return;   // project closed
    var bar = root.querySelector('[aria-pressed="true"] .loop i');
    if (bar && on.duration) bar.style.transform = 'scaleX(' + (on.currentTime / on.duration) + ')';
    requestAnimationFrame(tick);
  })();

  vids[0].classList.add('is-on');
  if (still) screen.classList.add('is-paused');

  // load the first clip when the section comes near, and play only while it's on screen
  var io = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      visible = entry.isIntersecting;
      if (visible && !started) show(buttons[0].dataset.clip);
      else if (visible) play(on);
      else on.pause();
    });
  }, { rootMargin: '200px 0px', threshold: 0 });
  io.observe(screen);
}

var LEGACY_SKIP = ['project-details', 'kuva-feature', 'kuva-flows', 'page-title'];

function fitFixedWidthProject() {
  var wrap = document.getElementById('wrap_project');
  var content = document.getElementById('content');
  if (!wrap || !content) return;

  // #content carries overflow-x:auto on this page, so mid-load its clientWidth
  // can briefly report the full scrollable 1400px rather than the visible box.
  // Taken at face value that looks like "it already fits" and the collage gets
  // unwrapped again — clamping to the viewport makes the measurement stable.
  var avail = Math.min(content.clientWidth || Infinity, window.innerWidth);
  if (!avail || avail === Infinity) return;

  var existing = wrap.querySelectorAll('.legacy-collage');
  var firstInner = existing.length ? existing[0].querySelector('.legacy-collage-inner') : null;
  var design = firstInner ? parseFloat(firstInner.style.width) : wrap.offsetWidth;

  // A fluid page (or a screen wide enough for the real thing) needs nothing.
  if (!design || design <= avail + 1) {
    if (existing.length) unwrapLegacy(wrap, existing);
    wrap.style.width = '';
    wrap.style.maxWidth = '';
    return;
  }

  // Match the reading column to .page-title, which sits outside #wrap_project
  // and is already inset by the site-wide 84% (see .page-title in style.css).
  // Filling the full viewport width instead left the title and tags indented
  // while the copy below them ran edge to edge — the thing that made this page
  // look unlike every other project on a phone.
  //
  // An explicit pixel width, not a percentage: #content carries
  // overflow-x:auto and a 1400px scrollable area, against which a percentage
  // resolved back to 1400 and left the column 780px wide on a 390px screen.
  var title = document.querySelector('.page-title');
  var column = title && title.offsetWidth ? title.offsetWidth
                                          : Math.round(avail * 0.84);
  wrap.style.width = column + 'px';
  wrap.style.maxWidth = column + 'px';

  // Two nested boxes per run. The inner one keeps the collage at its true
  // design width and is scaled with a transform; the outer one is the real
  // on-screen size and clips, because a transform leaves the layout box at
  // its unscaled 1400px and would otherwise put the horizontal scrollbar
  // straight back.
  //
  // transform, not the `zoom` property this first used: zoom is not reliably
  // applied everywhere, and when it silently no-ops the inner box just stays
  // 1400px wide inside a 380px column — which looks exactly like the page
  // being zoomed in. transform: scale() has no such gap in support, and since
  // these boxes are created here there is nothing for it to collide with.
  if (!existing.length) {
    groupLegacyRuns(wrap).forEach(function(run) {
      var box = document.createElement('div');
      box.className = 'legacy-collage';
      box.style.overflow = 'hidden';

      var inner = document.createElement('div');
      inner.className = 'legacy-collage-inner';
      inner.style.width = design + 'px';
      inner.style.display = 'flow-root';    // contain the floats
      inner.style.transformOrigin = 'top left';

      run[0].parentNode.insertBefore(box, run[0]);
      box.appendChild(inner);
      run.forEach(function(el) { inner.appendChild(el); });
    });
    existing = wrap.querySelectorAll('.legacy-collage');
  }

  // scaled to the reading column, so the collage lines up with the copy and
  // the title rather than bleeding past them
  var scale = column / design;
  Array.prototype.forEach.call(existing, function(box) {
    var inner = box.querySelector('.legacy-collage-inner');
    if (!inner) return;
    inner.style.transform = 'none';                 // measure unscaled
    var h = inner.offsetHeight;
    inner.style.transform = 'scale(' + scale + ')';
    box.style.width = column + 'px';
    box.style.height = Math.round(h * scale) + 'px';
  });
}

// contiguous runs of legacy siblings, split by the modern blocks between them
function groupLegacyRuns(wrap) {
  var runs = [], run = [];
  Array.prototype.forEach.call(wrap.children, function(el) {
    var modern = LEGACY_SKIP.some(function(c) { return el.classList.contains(c); });
    if (modern || el.classList.contains('legacy-collage')) {
      if (run.length) { runs.push(run); run = []; }
    } else {
      run.push(el);
    }
  });
  if (run.length) runs.push(run);
  return runs;
}

// lift the collage children back out of both boxes and drop the scaffolding
function unwrapLegacy(wrap, boxes) {
  Array.prototype.forEach.call(boxes, function(box) {
    var inner = box.querySelector('.legacy-collage-inner') || box;
    while (inner.firstChild) box.parentNode.insertBefore(inner.firstChild, box);
    box.parentNode.removeChild(box);
  });
}

// re-fit on rotate/resize, but only while a fixed-width project is open
window.addEventListener('resize', (function() {
  var t = null;
  return function() {
    clearTimeout(t);
    t = setTimeout(fitFixedWidthProject, 180);
  };
})());

// Calls cb once every image and video starting within the first ~1.2
// screens of root has loaded (videos: enough buffered to play), but not
// before minMs and at the latest after maxMs, so a slow connection or a
// video Safari won't preload never leaves the loader hanging. Unloaded
// images have no height yet, so everything first measures as "near the
// top"; each load re-measures and drops whatever has been pushed below.
function whenTopMediaReady(root, minMs, maxMs, cb) {
  var start = Date.now(), done = false;
  function finish() {
    if (done) return;
    done = true;
    setTimeout(cb, Math.max(0, minMs - (Date.now() - start)));
  }
  if (!root) { finish(); return; }
  function ready(el) {
    if (el.dataset.loadFailed) return true;
    return el.tagName === 'IMG' ? el.complete : el.readyState >= 3;
  }
  function waiting() {
    var cutoff = window.innerHeight * 1.2;
    var rootTop = root.getBoundingClientRect().top;
    return Array.prototype.filter.call(root.querySelectorAll('img, video'), function(el) {
      return el.id !== 'loader2' && !ready(el) &&
        el.getBoundingClientRect().top - rootTop <= cutoff;
    });
  }
  function check() { if (!done && !waiting().length) finish(); }
  waiting().forEach(function(el) {
    var ev = el.tagName === 'IMG' ? 'load' : 'canplay';
    el.addEventListener(ev, check, { once: true });
    el.addEventListener('error', function() { el.dataset.loadFailed = '1'; check(); }, { once: true });
  });
  check();
  setTimeout(finish, maxMs);
}

// Horizontal scroll-snap carousels (Kuva landing screens): the centred slide
// gets .is-active, dots and arrows follow the scroll position, and clicking
// an arrow, a dot or a dimmed neighbour scrolls that slide to the centre.
// Swipe and trackpad scrolling are native.
function initSnapCarousels(root) {
  if (!root) return;
  root.querySelectorAll('.kuva-landing').forEach(function(box) {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    var track = box.querySelector('.kl-track');
    var slides = [].slice.call(track.querySelectorAll('.kl-slide'));
    var dotsEl = box.querySelector('.kl-dots');
    var prev = box.querySelector('.kl-prev');
    var next = box.querySelector('.kl-next');
    var current = -1;
    // a click on empty project space closes the page; keep this one's clicks in
    box.addEventListener('click', function(e) { e.stopPropagation(); });

    var dots = slides.map(function(sl, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('role', 'tab');
      d.setAttribute('aria-label', 'Screen ' + (i + 1));
      d.addEventListener('click', function() { go(i); });
      dotsEl.appendChild(d);
      return d;
    });

    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var sl = slides[i];
      track.scrollTo({ left: sl.offsetLeft - (track.clientWidth - sl.offsetWidth) / 2, behavior: 'smooth' });
    }

    function sync() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      slides.forEach(function(sl, i) {
        var d = Math.abs(sl.offsetLeft + sl.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best === current) return;
      current = best;
      slides.forEach(function(sl, i) { sl.classList.toggle('is-active', i === best); });
      dots.forEach(function(d, i) { d.setAttribute('aria-selected', i === best ? 'true' : 'false'); });
      prev.disabled = best === 0;
      next.disabled = best === slides.length - 1;
    }

    var raf = null;
    track.addEventListener('scroll', function() {
      if (raf) return;
      raf = requestAnimationFrame(function() { raf = null; sync(); });
    }, { passive: true });
    prev.addEventListener('click', function() { go(current - 1); });
    next.addEventListener('click', function() { go(current + 1); });
    slides.forEach(function(sl, i) {
      sl.addEventListener('click', function(e) {
        if (i === current) return;
        e.preventDefault();
        e.stopPropagation();
        go(i);
      }, true);   // capture: #content's img click handler stops propagation
    });
    sync();
  });
}

function folioDone(target) {
	console.log('--- folio done', target);
  // only if req is "loaded"
  if (req.readyState == 4) {
    // only if "OK"
    if (req.status == 200) {
      results = req.responseText;
      document.getElementById(target).innerHTML = results;
      // The fragment's own <style> sets #wrap_project's hidden start state
      // (opacity 0, pushed down) along with transition: all. If the browser
      // paints the markup once before that style applies (Safari does), the
      // transition animates visible → hidden: the page slides down and fades
      // out before the real reveal. Hold transitions off until the reveal.
      var wraps = ['wrap_project', 'wrap_project2', 'wrap_project3', 'wrap_project4']
        .map(function(id) { return document.getElementById(id); })
        .filter(Boolean);
      wraps.forEach(function(w) { w.style.transition = 'none'; });
      $("#" + target).fadeTo(300, 1);   // a swapped-in page starts at 0 (swapFolio)
      setTimeout(function() {
        $(".scroll").fadeIn();
      }, 100);

      // Keep the loader up until the media at the top of the page has
      // loaded, so it doesn't reveal on empty boxes or GIFs still crawling
      // in; never sooner than the usual 1.5s, never later than 5s.
      whenTopMediaReady(document.getElementById(target), 1500, 5000, function() {
        /* 				window.location.hash='#test'; */
        var $sliders = $(".twentytwenty-container[data-orientation!='vertical']");
        $sliders.not(".twentytwenty-centered")
          .delay(0)
          .twentytwenty({ default_offset_pct: 0.2 });
        $sliders.filter(".twentytwenty-centered")
          .delay(0)
          .twentytwenty({ default_offset_pct: 0.5 });
        initCompareExpand();
        initGifVideos();
        initInPageAnchors();
        initProfileMotion();
        initTilesHero();
        // fadeTo, not fadeOut: fadeOut ends in display:none, which collapses
        // this in-flow element's space and jolts the content below it
        // upward right as #wrap_project is animating in.
        $("#loader2").fadeTo(400, 0);
        initParallax();
        initCounters();
        initVideoObserver();
        initKuvaFlows();
        initReveal();
        initStaggerRows();
        initApproachScroll();
        initProcessStack(document.getElementById('content'));
        initSnapCarousels(document.getElementById('content'));
        initScrollProgress();
        initCloseTip();
        fitFixedWidthProject();
        // again once the collage's images have decoded — their height feeds
        // the scaled box, and the first pass can land before they resolve
        setTimeout(fitFixedWidthProject, 1200);
        // transitions back on, flushed, so only the reveal itself animates
        wraps.forEach(function(w) { w.style.transition = ''; void w.offsetWidth; });
        $("#wrap_project")
          .delay()
          .addClass("project-alt");
        $("#wrap_project2")
          .delay()
          .addClass("project-alt");
        $("#wrap_project3")
          .delay()
          .addClass("project-alt");
        $("#wrap_project4")
          .delay()
          .addClass("project-alt");
      });

      $("#content img").on("click", function(e) {
        // An image inside a link is part of that link (e.g. the thumbnail
        // cards on the AI page) — cancelling the click here killed
        // the link and only its text label stayed clickable. Let it through;
        // the link's own handler (initInPageAnchors) stops it closing the page.
        if (this.closest('a[href]')) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (this.classList.contains('project-hero-img')) {
          openLightbox(this.src, this.alt);
        }
      });
      $("#content p").on("click", function(e) {
        /* e.preventDefault(); */
        e.stopImmediatePropagation();
      });
      $(".twentytwenty-container").on("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Only the handle has its own drag behavior (see jquery.twentytwenty.js
        // — it binds move listeners to .twentytwenty-handle, not the whole
        // container), so clicking anywhere else on the image is free to open
        // the full-screen comparison. Clicking the handle itself doesn't —
        // that's for dragging, and the expand button covers opening it instead.
        if (e.target.closest('.twentytwenty-handle') || e.target.closest('.compare-expand-btn')) return;
        openCompareLightboxFromContainer(this);
      });
      $("#content video").on("click", function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
      });

      $("#content").on("click", function(e) {
        if (window.getSelection && window.getSelection().toString()) return;
        // Pages marked data-no-click-close (AI, Memeo, …) close on a click
        // *outside* the content column, like every other project, but not on
        // one inside it (cards, links, gaps between paragraphs). The page's
        // own Close button relies on this handler too, so it always gets through.
        if (this.querySelector('[data-no-click-close]') &&
            !e.target.closest('.cta-close') &&
            e.target.closest('.project-details, .page-title')) return;
        close();
      });
      $("body").on("mousemove", function(e) {
        if (e.pageX > window.innerWidth - 30) {
          $("#content").css({ cursor: "default" });
        } else {
          $("#content").css({ cursor: "" });
        }
      });
    } else {
      document.getElementById(target).innerHTML =
        "jah error:\n" + req.statusText;
    }
  }
}

function close(clear = true) {
  var open = document.getElementById('remove');
  if (open) open.dataset.closing = '1';
  coverLanding(false);   // before the overlay fades, so the page is back underneath
  if (clear) {
    var title = 'Angelo Wellens | Product Work';
    if (window.history.state) {
    	window.history.go(-1);
    } else {
	    window.history.pushState({ title: title, url: '/' }, title, '/');
    }
  	document.title = title;
  }

  var t = document.getElementById('close-kbd-tip');
  if (t) t.remove();

  $("#content").fadeOut("fast", function() {
    // Just drop the inline lock — don't put overflow back on body. Any
    // overflow value there makes body a scroll container, which kills
    // #filter-bar's sticky once you return to the homepage.
    $("html").css("overflow", "");
    $("body").css({ overflow: "", "overflow-y": "" });
    $("#overlay").fadeOut("slow", function() {
      $("#remove").remove();
      resetViewportZoom();
    });
  });
}

// ESC closes an open project (not the menu — that has its own toggle).
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && !isMenuOpen && document.getElementById('remove')) {
    close();
  }
  if ((e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey && !e.altKey) {
    var t = e.target.tagName;
    if (t !== 'INPUT' && t !== 'TEXTAREA' && t !== 'SELECT') toggleTheme();
  }
});
